import type { CocktailListParams } from '@/api/endpoints/cocktails'
import type { IngredientListParams } from '@/api/endpoints/ingredients'

export const keys = {
    cocktails: {
        all:    ['cocktails'] as const,
        list:   (f: CocktailListParams) => ['cocktails', 'list', f] as const,
        detail: (id: string)            => ['cocktails', 'detail', id] as const,
        makeable:                          ['cocktails', 'makeable'] as const,
    },
    favorites: {
        ids: ['favorites', 'ids'] as const,
    },
    ratings: {
        byCocktail: (id: string) => ['ratings', id] as const,
    },
    pantry: {
        items: ['pantry', 'items'] as const,
    },
    derivations: {
        all: ['derivations'] as const,
    },
    plannedCocktails: {
        list: ['planned-cocktails', 'list'] as const,
    },
    plannedCollections: {
        list:    ['planned-collections', 'list'] as const,
        detail:  (id: string) => ['planned-collections', 'detail', id] as const,
        grocery: (id: string) => ['planned-collections', id, 'grocery'] as const,
    },
    smartCollections: {
        list:   ['smart-collections', 'list'] as const,
        detail: (slug: string) => ['smart-collections', 'detail', slug] as const,
    },
    ingredients: {
        search: (q: string)                          => ['ingredients', 'search', q] as const,
        list:   (params: IngredientListParams)         => ['ingredients', 'list', params] as const,
        detail: (id: string)                         => ['ingredients', 'detail', id] as const,
    },
    ingredientTypes: {
        all: ['ingredient-types'] as const,
    },
    ingredientSubTypes: {
        all: ['ingredient-subtypes'] as const,
    },
    profile: {
        me: ['profile', 'me'] as const,
    },
    stats: {
        all: ['user-stats'] as const,
    },
}
