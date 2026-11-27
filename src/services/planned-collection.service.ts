import { randomBytes } from 'crypto'
import { plannedCollectionRepository } from '@/repositories/planned-collection.repository'
import { pantryRepository, type PantryUsage } from '@/repositories/pantry.repository'
import { prisma } from '@/lib/db/prisma'
import { isPrismaErrorCode } from '@/lib/db/transaction'
import { invalidateMakeableCache } from '@/lib/cache/makeable-cache'
import { NotFoundError, ForbiddenError, ConflictError } from '@/utils/errors'
import { buildPantryMap, aggregateNeeded, computeGroceryList } from '@/utils/groceryCalculator'
import { isBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'
import type { GroceryItem } from '@/utils/groceryCalculator'
import type { QueryParams } from '@/lib/query/types'
import type { Prisma, RsvpStatus } from '@prisma/client'

type CollectionWithCocktails = NonNullable<Awaited<ReturnType<typeof plannedCollectionRepository.findWithCocktails>>>
type CollectionCocktailEntry = CollectionWithCocktails['cocktails'][number]
type CocktailIngredientEntry = CollectionCocktailEntry['cocktail']['ingredients'][number]

/** Guest (anonymous) RSVPs allowed per collection. */
export const MAX_GUEST_RSVPS_PER_COLLECTION = 200

/** Blocking ingredients of a collection cocktail scaled by the collection servings. */
function scaleEntry(entry: CollectionCocktailEntry, servings: number): PantryUsage[] {
    const ingredients = entry.cocktail?.ingredients ?? []
    return ingredients
        .filter(isBlockingCocktailIngredient)
        .map((ing: CocktailIngredientEntry) => ({
            ingredientId: ing.ingredientId,
            amount:       ing.amount != null ? ing.amount * servings : null,
            unit:         ing.unit,
            optional:     ing.optional,
            ingredient:   ing.ingredient,
        }))
}

class PlannedCollectionService {
    async getAll(params: QueryParams) {
        return plannedCollectionRepository.findMany(params)
    }

    async getById(id: string) {
        const item = await plannedCollectionRepository.findWithCocktails(id)
        if (!item) throw new NotFoundError('Planned collection not found')
        return item
    }

    async create(userId: string, data: {
        title: string
        location?: string | null
        guestNote?: string | null
        plannedFor: Date
        servings?: number
        occasions?: string[]
        cocktailIds?: string[]
    }) {
        return plannedCollectionRepository.createWithCocktails(userId, data)
    }

    async update(id: string, data: Prisma.PlannedCollectionUpdateInput) {
        const item = await plannedCollectionRepository.update(id, data)
        if (!item) throw new NotFoundError('Planned collection not found')
        return item
    }

    async delete(id: string) {
        const ok = await plannedCollectionRepository.hardDelete(id)
        if (!ok) throw new NotFoundError('Planned collection not found')
    }

    async addCocktail(id: string, cocktailId: string) {
        try {
            return await plannedCollectionRepository.addCocktail(id, cocktailId)
        } catch (err) {
            // Unique (planned_collection_id, cocktail_id): no check-then-insert race.
            if (isPrismaErrorCode(err, 'P2002')) throw new ConflictError('Cocktail already in collection')
            if (isPrismaErrorCode(err, 'P2003')) throw new NotFoundError('Cocktail or collection not found')
            throw err
        }
    }

    async removeCocktail(id: string, cocktailId: string) {
        await plannedCollectionRepository.removeCocktail(id, cocktailId)
    }

    /**
     * Complete a whole collection (DB-002 / DB-012). Claim-then-act inside one
     * transaction: the collection row is claimed first (409 if already done),
     * then only the cocktails THIS call flipped to done are deducted, with a
     * single batched pantry decrement. Cache invalidation happens after commit.
     */
    async complete(id: string) {
        const item = await plannedCollectionRepository.findWithCocktails(id)
        if (!item) throw new NotFoundError('Planned collection not found')
        if (item.status === 'done') throw new ConflictError('Planned collection already completed')

        const now = new Date()
        const entriesByCocktailId = new Map(
            (item.cocktails as CollectionCocktailEntry[]).map((entry) => [entry.cocktailId, entry]),
        )

        await prisma.$transaction(async (tx) => {
            const claimed = await plannedCollectionRepository.claimCompletion(id, now, tx)
            if (!claimed) throw new ConflictError('Planned collection already completed')

            const claimedCocktailIds = await plannedCollectionRepository.completeAllCocktails(id, now, tx)
            const usages = claimedCocktailIds
                .map((cocktailId) => entriesByCocktailId.get(cocktailId))
                .filter((entry): entry is CollectionCocktailEntry => !!entry)
                .map((entry) => scaleEntry(entry, item.servings))
                .filter((list) => list.length > 0)

            if (usages.length) {
                await pantryRepository.decrementForCocktails(item.userId, usages, tx)
            }
        })

        await invalidateMakeableCache(item.userId)
        return plannedCollectionRepository.findWithCocktails(id)
    }

    /**
     * Complete one cocktail of a collection. Claim-then-act (DB-002): a second
     * call for the same cocktail gets 409 and never deducts twice.
     */
    async completeCocktail(id: string, cocktailId: string) {
        const item = await plannedCollectionRepository.findWithCocktails(id)
        if (!item) throw new NotFoundError('Planned collection not found')

        const entry = (item.cocktails as CollectionCocktailEntry[]).find(c => c.cocktailId === cocktailId)
        if (!entry) throw new NotFoundError('Cocktail not found in collection')
        if (entry.status === 'done') throw new ConflictError('Cocktail already completed')

        const now = new Date()
        const scaledIngredients = scaleEntry(entry, item.servings)

        await prisma.$transaction(async (tx) => {
            const claimed = await plannedCollectionRepository.completeCocktail(id, cocktailId, now, tx)
            if (claimed.count !== 1) throw new ConflictError('Cocktail already completed')

            if (scaledIngredients.length) {
                await pantryRepository.decrementForCocktail(item.userId, scaledIngredients, tx)
            }

            const stillHasPlanned = await plannedCollectionRepository.hasPlannedCocktails(id, tx)
            if (!stillHasPlanned) {
                await plannedCollectionRepository.claimCompletion(id, now, tx)
            }
        })

        await invalidateMakeableCache(item.userId)
        return plannedCollectionRepository.findWithCocktails(id)
    }

    async getGroceryList(id: string, userId: string): Promise<GroceryItem[]> {
        const [collection, pantryResult] = await Promise.all([
            plannedCollectionRepository.findWithCocktails(id),
            pantryRepository.findMany({ filters: { userId }, limit: 500 }),
        ])
        if (!collection) throw new NotFoundError('Planned collection not found')

        const pantryMap = buildPantryMap(pantryResult.data)

        const ingredients = (collection.cocktails as CollectionCocktailEntry[])
            .filter(entry => collection.status !== 'done' && entry.status !== 'done')
            .flatMap((entry) => {
            const cocktail = entry.cocktail
            if (!cocktail?.ingredients) return []
            return cocktail.ingredients.filter(isBlockingCocktailIngredient).map((ing: CocktailIngredientEntry) => ({
                ingredientId:   ing.ingredientId,
                ingredientName: ing.ingredient?.name ?? ing.ingredientId,
                amount:         (ing.amount ?? 0) * collection.servings,
                unit:           ing.unit,
                optional:       ing.optional,
                typeName:       ing.ingredient?.type?.name,
                subTypeName:    ing.ingredient?.subType?.name,
                isAlcoholic:    ing.ingredient?.isAlcoholic,
            }))
        })

        const needed = aggregateNeeded(ingredients)
        return computeGroceryList(needed, pantryMap)
    }

    async generateShareToken(id: string) {
        const token = randomBytes(20).toString('hex')
        return plannedCollectionRepository.setShareToken(id, token, true)
    }

    async revokeShareToken(id: string) {
        return plannedCollectionRepository.setShareToken(id, null, false)
    }

    async getPublicView(token: string) {
        const collection = await plannedCollectionRepository.findByShareToken(token)
        if (!collection || !collection.shareEnabled) {
            throw new NotFoundError('Invite link not found or has been revoked')
        }
        return collection
    }

    async addRsvp(token: string, data: {
        name: string
        status: RsvpStatus
        guestCount: number
        note?: string | null
        email?: string | null
        userId?: string | null
    }) {
        const collection = await plannedCollectionRepository.findShareInfoByToken(token)
        if (!collection || !collection.shareEnabled) {
            throw new NotFoundError('Invite link not found or has been revoked')
        }
        if (!data.userId) {
            // Guest RSVPs cannot be deduplicated (no identity): cap them per collection.
            const guests = await plannedCollectionRepository.countGuestRsvps(collection.id)
            if (guests >= MAX_GUEST_RSVPS_PER_COLLECTION) {
                throw new ConflictError('This event has reached its guest RSVP limit')
            }
        }
        return plannedCollectionRepository.createRsvp({ collectionId: collection.id, ...data })
    }

    assertOwnership(item: { userId: string }, userId: string, isAdmin: boolean) {
        if (item.userId !== userId && !isAdmin) {
            throw new ForbiddenError('You can only access your own planned collections')
        }
    }
}

export const plannedCollectionService = new PlannedCollectionService()
