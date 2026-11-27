import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

/**
 * Cache invalidators shared by mutations. Every invalidator returns a promise
 * that resolves once the active queries it touched have refetched, so callers
 * can `return`/`await` it from `onSuccess`/`onSettled` and keep the mutation
 * pending until fresh data is on screen.
 *
 * `stale(...)` marks queries stale without refetching active observers — used
 * for broad, expensive or rarely-visible caches that only need to be fresh on
 * their next mount.
 */
function refetch(qc: QueryClient, queryKey: QueryKey) {
    return qc.invalidateQueries({ queryKey })
}

function stale(qc: QueryClient, queryKey: QueryKey) {
    return qc.invalidateQueries({ queryKey, refetchType: 'none' })
}

export const invalidators = {
    pantry(qc: QueryClient) {
        return Promise.all([
            refetch(qc, queryKeys.pantry.all),
            refetch(qc, queryKeys.makeable.all),
        ])
    },
    /**
     * Narrow: only the rated cocktail's rating list + detail; cocktail lists are marked stale.
     * Aggregate stats (`ratings.stats`) are written by the rate mutation from its response,
     * so they are not refetched here.
     */
    ratings(qc: QueryClient, cocktailId?: string) {
        if (!cocktailId) {
            return Promise.all([
                refetch(qc, queryKeys.ratings.all),
                stale(qc, queryKeys.cocktails.all),
                refetch(qc, queryKeys.makeable.bestRated()),
            ])
        }
        return Promise.all([
            refetch(qc, queryKeys.ratings.list({ cocktailId })),
            refetch(qc, queryKeys.cocktails.detail(cocktailId)),
            stale(qc, queryKeys.cocktails.lists()),
            refetch(qc, queryKeys.makeable.bestRated()),
        ])
    },
    favorites(qc: QueryClient) {
        return refetch(qc, queryKeys.favorites.all)
    },
    cocktails(qc: QueryClient) {
        return Promise.all([
            refetch(qc, queryKeys.cocktails.all),
            refetch(qc, queryKeys.makeable.all),
        ])
    },
    cocktailDetail(qc: QueryClient, id: string) {
        return Promise.all([
            refetch(qc, queryKeys.cocktails.detail(id)),
            stale(qc, queryKeys.cocktails.lists()),
            refetch(qc, queryKeys.makeable.all),
        ])
    },
    plannedCocktails(qc: QueryClient) {
        return Promise.all([
            refetch(qc, queryKeys.plannedCocktails.all),
            refetch(qc, queryKeys.plannedCollections.all),
        ])
    },
    plannedCollectionGrocery(qc: QueryClient, id: string) {
        return Promise.all([
            refetch(qc, queryKeys.plannedCollections.grocery(id)),
            refetch(qc, queryKeys.pantry.all),
            refetch(qc, queryKeys.pantryStats.all),
            refetch(qc, queryKeys.makeable.all),
        ])
    },
    plannedCollectionComplete(qc: QueryClient, id: string) {
        return Promise.all([
            refetch(qc, queryKeys.plannedCocktails.all),
            refetch(qc, queryKeys.plannedCollections.all),
            refetch(qc, queryKeys.plannedCollections.grocery(id)),
            refetch(qc, queryKeys.pantry.all),
            refetch(qc, queryKeys.pantryStats.all),
            refetch(qc, queryKeys.makeable.all),
            refetch(qc, queryKeys.userStats.all),
        ])
    },
    cocktailMade(qc: QueryClient, cocktailId: string) {
        return Promise.all([
            refetch(qc, queryKeys.cocktailMadeLogs.all),
            refetch(qc, queryKeys.plannedCocktails.all),
            refetch(qc, queryKeys.pantry.all),
            refetch(qc, queryKeys.makeable.all),
            refetch(qc, queryKeys.userStats.all),
            ...(cocktailId ? [refetch(qc, queryKeys.cocktails.detail(cocktailId))] : []),
        ])
    },
    cocktailMadeLogRemoved(qc: QueryClient) {
        return Promise.all([
            refetch(qc, queryKeys.cocktailMadeLogs.all),
            refetch(qc, queryKeys.userStats.all),
        ])
    },
    /**
     * Ingredient edits (admin) change names/types embedded in cocktails and
     * makeable results, but those caches are large: mark them stale instead of
     * refetching every active list immediately.
     */
    ingredients(qc: QueryClient) {
        return Promise.all([
            refetch(qc, queryKeys.ingredients.all),
            stale(qc, queryKeys.cocktails.all),
            stale(qc, queryKeys.makeable.all),
        ])
    },
    staticCatalog(qc: QueryClient) {
        return Promise.all([
            refetch(qc, queryKeys.barTools.all),
            refetch(qc, queryKeys.glasses.all),
            refetch(qc, queryKeys.ingredientTypes.all),
            refetch(qc, queryKeys.ingredientSubTypes.all),
        ])
    },
    suggestions(qc: QueryClient) {
        return refetch(qc, queryKeys.suggestions.all)
    },
} as const
