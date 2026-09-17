import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export const invalidators = {
    pantry(qc: QueryClient) {
        qc.invalidateQueries({ queryKey: queryKeys.pantry.all })
        qc.invalidateQueries({ queryKey: queryKeys.makeable.all })
    },
    ratings(qc: QueryClient) {
        qc.invalidateQueries({ queryKey: queryKeys.ratings.all })
        qc.invalidateQueries({ queryKey: queryKeys.cocktails.all })
        qc.invalidateQueries({ queryKey: queryKeys.makeable.bestRated() })
    },
    favorites(qc: QueryClient) {
        qc.invalidateQueries({ queryKey: queryKeys.favorites.all })
    },
    cocktails(qc: QueryClient) {
        qc.invalidateQueries({ queryKey: queryKeys.cocktails.all })
        qc.invalidateQueries({ queryKey: queryKeys.makeable.all })
    },
    cocktailDetail(qc: QueryClient, id: string) {
        qc.invalidateQueries({ queryKey: queryKeys.cocktails.detail(id) })
        qc.invalidateQueries({ queryKey: queryKeys.makeable.all })
    },
    plannedCocktails(qc: QueryClient) {
        qc.invalidateQueries({ queryKey: queryKeys.plannedCocktails.all })
        qc.invalidateQueries({ queryKey: queryKeys.plannedCollections.all })
    },
    plannedCollectionGrocery(qc: QueryClient, id: string) {
        qc.invalidateQueries({ queryKey: queryKeys.plannedCollections.grocery(id) })
        qc.invalidateQueries({ queryKey: queryKeys.pantry.all })
        qc.invalidateQueries({ queryKey: queryKeys.pantryStats.all })
        qc.invalidateQueries({ queryKey: queryKeys.makeable.all })
    },
    plannedCollectionComplete(qc: QueryClient, id: string) {
        qc.invalidateQueries({ queryKey: queryKeys.plannedCocktails.all })
        qc.invalidateQueries({ queryKey: queryKeys.plannedCollections.all })
        qc.invalidateQueries({ queryKey: queryKeys.plannedCollections.grocery(id) })
        qc.invalidateQueries({ queryKey: queryKeys.pantry.all })
        qc.invalidateQueries({ queryKey: queryKeys.pantryStats.all })
        qc.invalidateQueries({ queryKey: queryKeys.makeable.all })
        qc.invalidateQueries({ queryKey: queryKeys.userStats.all })
    },
    cocktailMade(qc: QueryClient, cocktailId: string) {
        qc.invalidateQueries({ queryKey: queryKeys.cocktailMadeLogs.all })
        qc.invalidateQueries({ queryKey: queryKeys.plannedCocktails.all })
        qc.invalidateQueries({ queryKey: queryKeys.pantry.all })
        qc.invalidateQueries({ queryKey: queryKeys.makeable.all })
        qc.invalidateQueries({ queryKey: queryKeys.userStats.all })
        qc.invalidateQueries({ queryKey: queryKeys.cocktails.detail(cocktailId) })
    },
    ingredients(qc: QueryClient) {
        qc.invalidateQueries({ queryKey: queryKeys.ingredients.all })
        qc.invalidateQueries({ queryKey: queryKeys.cocktails.all })
        qc.invalidateQueries({ queryKey: queryKeys.makeable.all })
    },
    staticCatalog(qc: QueryClient) {
        qc.invalidateQueries({ queryKey: queryKeys.barTools.all })
        qc.invalidateQueries({ queryKey: queryKeys.glasses.all })
        qc.invalidateQueries({ queryKey: queryKeys.ingredientTypes.all })
        qc.invalidateQueries({ queryKey: queryKeys.ingredientSubTypes.all })
    },
} as const
