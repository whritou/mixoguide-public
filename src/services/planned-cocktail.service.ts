import { plannedCocktailRepository } from '@/repositories/planned-cocktail.repository'
import { cocktailMadeLogService } from '@/services/cocktail-made-log.service'
import { cocktailRepository } from '@/repositories/cocktail.repository'
import { pantryRepository, type PantryUsage } from '@/repositories/pantry.repository'
import { prisma } from '@/lib/db/prisma'
import { claimIdempotencyKey, releaseIdempotencyKey } from '@/lib/cache/idempotency'
import { invalidateMakeableCache } from '@/lib/cache/makeable-cache'
import { NotFoundError, ForbiddenError, ConflictError } from '@/utils/errors'
import { isBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'
import type { QueryParams } from '@/lib/query/types'
import type { Prisma } from '@prisma/client'

export type { GroceryItem } from '@/utils/groceryCalculator'

type RecipeIngredient = PantryUsage & { amount: number | null }

/** Blocking recipe ingredients scaled by the number of servings. */
function scaleIngredients(ingredients: RecipeIngredient[], servings: number): PantryUsage[] {
    return ingredients
        .filter(isBlockingCocktailIngredient)
        .map(ing => ({
            ingredientId: ing.ingredientId,
            amount:       ing.amount != null ? ing.amount * servings : null,
            unit:         ing.unit,
            optional:     ing.optional,
            ingredient:   ing.ingredient,
        }))
}

class PlannedCocktailService {
    async getAll(params: QueryParams) {
        return plannedCocktailRepository.findMany(params)
    }

    async getById(id: string) {
        const item = await plannedCocktailRepository.findById(id, ['cocktail'])
        if (!item) throw new NotFoundError('Planned cocktail not found')
        return item
    }

    async create(data: Prisma.PlannedCocktailUncheckedCreateInput) {
        return plannedCocktailRepository.upsertPlanned(data)
    }

    async update(id: string, data: Prisma.PlannedCocktailUpdateInput) {
        const item = await plannedCocktailRepository.update(id, data)
        if (!item) throw new NotFoundError('Planned cocktail not found')
        return item
    }

    async delete(id: string) {
        const ok = await plannedCocktailRepository.hardDelete(id)
        if (!ok) throw new NotFoundError('Planned cocktail not found')
    }

    async findByUserAndCocktail(userId: string, cocktailId: string) {
        return plannedCocktailRepository.findByUserAndCocktail(userId, cocktailId)
    }

    /**
     * Record that the user made a cocktail right now: upsert the planner row as
     * done, append a made-log and deduct the pantry — all in ONE transaction
     * (DB-002). An optional idempotency key deduplicates client retries.
     */
    async makeNow(
        userId: string,
        cocktailId: string,
        quantity: number,
        options: { idempotencyKey?: string | null } = {},
    ) {
        const cocktail = await cocktailRepository.findWithIngredients(cocktailId)
        if (!cocktail) throw new NotFoundError('Cocktail not found')

        const idemKey = options.idempotencyKey ?? null
        if (idemKey && !(await claimIdempotencyKey('make', userId, idemKey))) {
            throw new ConflictError('This request was already processed')
        }

        const now = new Date()
        const scaledIngredients = scaleIngredients(cocktail.ingredients, quantity)

        let planned
        try {
            planned = await prisma.$transaction(async (tx) => {
                const row = await plannedCocktailRepository.upsertAsMade(userId, cocktailId, quantity, now, tx)
                // Record each making as a separate log entry (enables full history)
                await cocktailMadeLogService.create({ userId, cocktailId, quantity, madeAt: now }, tx)
                if (scaledIngredients.length) {
                    await pantryRepository.decrementForCocktail(userId, scaledIngredients, tx)
                }
                return row
            })
        } catch (err) {
            if (idemKey) await releaseIdempotencyKey('make', userId, idemKey)
            throw err
        }

        // After commit only.
        await invalidateMakeableCache(userId)
        return planned
    }

    /**
     * Complete a planned cocktail. Claim-then-act (DB-002): the `planned → done`
     * transition is claimed first; the made-log and the pantry deduction happen in
     * the same transaction, so a retry / double tap yields 409 instead of a second
     * log and a second deduction.
     */
    async complete(id: string) {
        const item = await plannedCocktailRepository.findWithCocktailIngredients(id)
        if (!item) throw new NotFoundError('Planned cocktail not found')
        if (item.status === 'done') throw new ConflictError('Planned cocktail already completed')

        const now = new Date()
        const scaledIngredients = scaleIngredients(item.cocktail?.ingredients ?? [], item.quantity)

        await prisma.$transaction(async (tx) => {
            const claimed = await plannedCocktailRepository.claimCompletion(id, now, tx)
            if (!claimed) throw new ConflictError('Planned cocktail already completed')

            await cocktailMadeLogService.create({
                userId:     item.userId,
                cocktailId: item.cocktailId,
                quantity:   item.quantity,
                madeAt:     now,
            }, tx)

            if (scaledIngredients.length) {
                await pantryRepository.decrementForCocktail(item.userId, scaledIngredients, tx)
            }
        })

        await invalidateMakeableCache(item.userId)
        return { ...item, status: 'done' as const, completedAt: now }
    }

    assertOwnership(item: { userId: string }, userId: string, isAdmin: boolean) {
        if (item.userId !== userId && !isAdmin) {
            throw new ForbiddenError('You can only access your own planned cocktails')
        }
    }
}

export const plannedCocktailService = new PlannedCocktailService()
