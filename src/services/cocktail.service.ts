import { cocktailRepository } from '@/repositories/cocktail.repository'
import { getDerivationMap } from '@/lib/derivations/derivation-cache'
import { bumpCatalogVersion, clampMaxMissing, getMakeableCache, setMakeableCache } from '@/lib/cache/makeable-cache'
import { NotFoundError } from '@/utils/errors'
import type { Flavor, Occasion, Technique } from '@prisma/client'
import type { MakeableCocktail, MakeablePreview } from '@/types/models/cocktail'
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

    async getMakeable(userId: string, maxMissingRaw: number = 3) {
        const maxMissing = clampMaxMissing(maxMissingRaw)
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

    async getBestMakeable(userId: string, maxMissingRaw: number = 3) {
        const maxMissing = clampMaxMissing(maxMissingRaw)
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

    async previewMakeable(ingredientIds: string[], maxMissing: 0 | 1 = 1, cocktailId?: string): Promise<MakeablePreview> {
        const ids = [...new Set(ingredientIds)]
        const derivationMap = await getDerivationMap()
        const [results, target] = await Promise.all([
            cocktailRepository.findMakeable(ids, maxMissing, derivationMap, 200),
            cocktailId ? cocktailRepository.findMakeableTarget(cocktailId, ids, derivationMap) : undefined,
        ])

        const full = results
            .filter(c => c.missingCount === 0)
            .sort((a, b) => {
                const ratingDiff = (b.avgRating ?? 0) - (a.avgRating ?? 0)
                if (ratingDiff !== 0) return ratingDiff
                return (b.ratingCount ?? 0) - (a.ratingCount ?? 0)
            })

        const groups = new Map<string, { ingredient: { id: string; name: string }; unlocks: { id: string; name: string }[] }>()
        for (const c of results) {
            if (c.missingCount !== 1) continue
            const missing = c.missingIngredients[0]
            if (!missing) continue
            const group = groups.get(missing.id) ?? { ingredient: missing, unlocks: [] }
            group.unlocks.push({ id: c.id, name: c.name })
            groups.set(missing.id, group)
        }

        let best: { ingredient: { id: string; name: string }; unlocks: { id: string; name: string }[] } | null = null
        for (const group of groups.values()) {
            if (!best || group.unlocks.length > best.unlocks.length) best = group
        }

        return {
            makeableCount: full.length,
            top: full.slice(0, 8) as unknown as MakeableCocktail[],
            oneBottleAway: best && { ingredient: best.ingredient, unlocks: best.unlocks.slice(0, 2) },
            ...(target !== undefined && { target }),
        }
    }

    async create(data: CreateCocktailInput) {
        // Strip relation fields handled separately by sync methods
        const { ingredients: _ing, barToolIds: _tools, ...rest } = data
        const cocktail = await cocktailRepository.create({
            ...rest,
            flavors:   rest.flavors   as Flavor[]    | undefined,
            occasions: rest.occasions as Occasion[]  | undefined,
            technique: rest.technique as Technique[] | undefined,
        })
        await bumpCatalogVersion()
        return cocktail
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
        await bumpCatalogVersion()
        return cocktail
    }

    async delete(id: string) {
        const ok = await cocktailRepository.deletePreservingMadeLogStats(id)
        if (!ok) throw new NotFoundError('Cocktail not found')
        await bumpCatalogVersion()
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
        // Recipes changed: every user's makeable results may change.
        await bumpCatalogVersion()
    }

    // ─── PRIVATE ──────────────────────────────────────────────────────────────

    private async assertExists(cocktailId: string) {
        const exists = await cocktailRepository.exists({ id: cocktailId })
        if (!exists) throw new NotFoundError('Cocktail not found')
    }
}

export const cocktailService = new CocktailService()
