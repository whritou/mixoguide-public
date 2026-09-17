import { randomBytes } from 'crypto'
import { plannedCollectionRepository } from '@/repositories/planned-collection.repository'
import { pantryRepository } from '@/repositories/pantry.repository'
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
        const already = await plannedCollectionRepository.hasCocktail(id, cocktailId)
        if (already) throw new ConflictError('Cocktail already in collection')
        return plannedCollectionRepository.addCocktail(id, cocktailId)
    }

    async removeCocktail(id: string, cocktailId: string) {
        await plannedCollectionRepository.removeCocktail(id, cocktailId)
    }

    async complete(id: string) {
        const item = await plannedCollectionRepository.findWithCocktails(id)
        if (!item) throw new NotFoundError('Planned collection not found')

        const now = new Date()

        for (const entry of item.cocktails as CollectionCocktailEntry[]) {
            if (entry.status === 'done') continue
            const cocktail = entry.cocktail
            if (!cocktail?.ingredients?.length) continue
            const scaledIngredients = cocktail.ingredients
                .filter(isBlockingCocktailIngredient)
                .map((ing: CocktailIngredientEntry) => ({
                    ingredientId: ing.ingredientId,
                    amount:       ing.amount != null ? ing.amount * item.servings : null,
                    unit:         ing.unit,
                    optional:     ing.optional,
                    ingredient:   ing.ingredient,
                }))
            if (scaledIngredients.length) {
                await pantryRepository.decrementForCocktail(item.userId, scaledIngredients)
            }
        }

        await plannedCollectionRepository.completeAllCocktails(id, now)
        await plannedCollectionRepository.update(id, {
            status:      'done',
            completedAt: now,
        })
        await invalidateMakeableCache(item.userId)
        return plannedCollectionRepository.findWithCocktails(id)
    }

    async completeCocktail(id: string, cocktailId: string) {
        const item = await plannedCollectionRepository.findWithCocktails(id)
        if (!item) throw new NotFoundError('Planned collection not found')

        const entry = (item.cocktails as CollectionCocktailEntry[]).find(c => c.cocktailId === cocktailId)
        if (!entry) throw new NotFoundError('Cocktail not found in collection')

        if (entry.status !== 'done') {
            const cocktail = entry.cocktail
            const scaledIngredients = cocktail?.ingredients
                ?.filter(isBlockingCocktailIngredient)
                .map((ing: CocktailIngredientEntry) => ({
                    ingredientId: ing.ingredientId,
                    amount:       ing.amount != null ? ing.amount * item.servings : null,
                    unit:         ing.unit,
                    optional:     ing.optional,
                    ingredient:   ing.ingredient,
                })) ?? []

            if (scaledIngredients.length) {
                await pantryRepository.decrementForCocktail(item.userId, scaledIngredients)
            }

            const now = new Date()
            await plannedCollectionRepository.completeCocktail(id, cocktailId, now)
            const stillHasPlanned = await plannedCollectionRepository.hasPlannedCocktails(id)
            if (!stillHasPlanned) {
                await plannedCollectionRepository.update(id, {
                    status:      'done',
                    completedAt: now,
                })
            }
            await invalidateMakeableCache(item.userId)
        }

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
        const collection = await plannedCollectionRepository.findByShareToken(token)
        if (!collection || !collection.shareEnabled) {
            throw new NotFoundError('Invite link not found or has been revoked')
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
