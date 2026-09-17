import { plannedCocktailRepository } from '@/repositories/planned-cocktail.repository'
import { cocktailMadeLogService } from '@/services/cocktail-made-log.service'
import { cocktailRepository } from '@/repositories/cocktail.repository'
import { pantryRepository } from '@/repositories/pantry.repository'
import { invalidateMakeableCache } from '@/lib/cache/makeable-cache'
import { NotFoundError, ForbiddenError } from '@/utils/errors'
import { isBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'
import type { QueryParams } from '@/lib/query/types'
import type { Prisma } from '@prisma/client'

export type { GroceryItem } from '@/utils/groceryCalculator'

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

    async makeNow(userId: string, cocktailId: string, quantity: number) {
        const cocktail = await cocktailRepository.findWithIngredients(cocktailId)
        if (!cocktail) throw new NotFoundError('Cocktail not found')

        const now = new Date()
        const planned = await plannedCocktailRepository.upsertAsMade(userId, cocktailId, quantity, now)

        // Record each making as a separate log entry (enables full history)
        await cocktailMadeLogService.create({ userId, cocktailId, quantity, madeAt: now })

        const scaledIngredients = cocktail.ingredients
            .filter(isBlockingCocktailIngredient)
            .map(ing => ({
                ingredientId: ing.ingredientId,
                amount:       ing.amount != null ? ing.amount * quantity : null,
                unit:         ing.unit,
                optional:     ing.optional,
                ingredient:   ing.ingredient,
            }))

        if (scaledIngredients.length) {
            await pantryRepository.decrementForCocktail(userId, scaledIngredients)
            await invalidateMakeableCache(userId)
        }

        return planned
    }

    async complete(id: string) {
        const item = await plannedCocktailRepository.findWithCocktailIngredients(id)
        if (!item) throw new NotFoundError('Planned cocktail not found')

        const now = new Date()

        await plannedCocktailRepository.update(id, {
            status:      'done',
            completedAt: now,
        })

        // Record each making as a separate log entry (enables full history)
        await cocktailMadeLogService.create({
            userId:    item.userId,
            cocktailId: item.cocktailId,
            quantity:  item.quantity,
            madeAt:    now,
        })

        const scaledIngredients = (item.cocktail?.ingredients ?? [])
            .filter(isBlockingCocktailIngredient)
            .map(ing => ({
                ingredientId: ing.ingredientId,
                amount:       ing.amount != null ? ing.amount * item.quantity : null,
                unit:         ing.unit,
                optional:     ing.optional,
                ingredient:   ing.ingredient,
            }))

        if (scaledIngredients.length) {
            await pantryRepository.decrementForCocktail(item.userId, scaledIngredients)
            await invalidateMakeableCache(item.userId)
        }

        return { ...item, status: 'done' as const, completedAt: now }
    }

    assertOwnership(item: { userId: string }, userId: string, isAdmin: boolean) {
        if (item.userId !== userId && !isAdmin) {
            throw new ForbiddenError('You can only access your own planned cocktails')
        }
    }
}

export const plannedCocktailService = new PlannedCocktailService()
