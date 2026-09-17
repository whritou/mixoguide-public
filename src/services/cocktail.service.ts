import { cocktailRepository } from '@/repositories/cocktail.repository'
import { getDerivationMap } from '@/lib/derivations/derivation-cache'
import { getMakeableCache, setMakeableCache } from '@/lib/cache/makeable-cache'
import { NotFoundError } from '@/utils/errors'
import type { Flavor, Occasion, Technique } from '@prisma/client'
import type { QueryParams } from '@/lib/query/types'
import type { CreateCocktailInput, UpdateCocktailInput } from '@/validations'

class CocktailService {

    async getAll(params: QueryParams) {
        return cocktailRepository.findMany(params)
    }

    async getById(id: string) {
        const cocktail = await cocktailRepository.findWithFullDetails(id)
        if (!cocktail) throw new NotFoundError('Cocktail not found')
        return cocktail
    }

    async getMakeable(userId: string, maxMissing = 3) {
        const [pantryItems, derivationMap] = await Promise.all([
            cocktailRepository.findPantryItemsForMakeable(userId),
            getDerivationMap(),
        ])
        const ingredientIds = pantryItems.map((p) => p.ingredientId)
        const pantryQuantities = new Map(
            pantryItems
                .filter(p => p.isInfinite || (p.quantity != null && p.unitLeft != null))
                .map(p => [p.ingredientId, {
                    quantity: p.quantity ?? 0,
                    unit: (p.unitLeft ?? 'cl') as string,
                    isInfinite: p.isInfinite,
                }])
        )
        return cocktailRepository.findMakeable(ingredientIds, maxMissing, derivationMap, 200, pantryQuantities)
    }

    async getBestMakeable(userId: string, maxMissing = 3) {
        const cached = await getMakeableCache(userId, maxMissing)
        if (cached) return cached

        const result = (await this.getMakeable(userId, maxMissing))
            .sort((a, b) => {
                if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount
                const ratingDiff = (b.avgRating ?? 0) - (a.avgRating ?? 0)
                if (ratingDiff !== 0) return ratingDiff
                return (b.ratingCount ?? 0) - (a.ratingCount ?? 0)
            })
            .slice(0, 10)

        await setMakeableCache(userId, maxMissing, result as unknown as import('@/types/models/cocktail').MakeableCocktail[])
        return result
    }

    async create(data: CreateCocktailInput) {
        // Strip relation fields handled separately by sync methods
        const { ingredients: _ing, barToolIds: _tools, ...rest } = data
        return cocktailRepository.create({
            ...rest,
            flavors:   rest.flavors   as Flavor[]    | undefined,
            occasions: rest.occasions as Occasion[]  | undefined,
            technique: rest.technique as Technique[] | undefined,
        })
    }

    async update(id: string, data: UpdateCocktailInput) {
        // Strip relation fields handled separately by sync methods
        const { ingredients: _ing, barToolIds: _tools, ...rest } = data
        const cocktail = await cocktailRepository.update(id, {
            ...rest,
            flavors:   rest.flavors   as Flavor[]    | undefined,
            occasions: rest.occasions as Occasion[]  | undefined,
            technique: rest.technique as Technique[] | undefined,
        })
        if (!cocktail) throw new NotFoundError('Cocktail not found')
        return cocktail
    }

    async delete(id: string) {
        const ok = await cocktailRepository.deletePreservingMadeLogStats(id)
        if (!ok) throw new NotFoundError('Cocktail not found')
    }

    // ─── RELATION SYNC (many-to-many) ─────────────────────────────────────────

    async syncBarTools(cocktailId: string, barToolIds: string[]) {
        await this.assertExists(cocktailId)
        await cocktailRepository.syncBarTools(cocktailId, barToolIds)
    }

    async syncIngredients(
        cocktailId: string,
        ingredients: Array<{
            ingredientId: string
            amount?:      number
            unit?:        string
            optional?:    boolean
            substitutes?: string[]
        }>
    ) {
        await this.assertExists(cocktailId)
        await cocktailRepository.syncIngredients(cocktailId, ingredients)
    }

    // ─── PRIVATE ──────────────────────────────────────────────────────────────

    private async assertExists(cocktailId: string) {
        const exists = await cocktailRepository.exists({ id: cocktailId })
        if (!exists) throw new NotFoundError('Cocktail not found')
    }
}

export const cocktailService = new CocktailService()
