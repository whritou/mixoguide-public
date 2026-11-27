export type ListParams = Record<string, string | number | boolean | string[] | undefined>

export const queryKeys = {
    cocktails: {
        all:     ['cocktails'] as const,
        lists:   () => [...queryKeys.cocktails.all, 'list'] as const,
        list:    (params: ListParams) => [...queryKeys.cocktails.lists(), params] as const,
        details: () => [...queryKeys.cocktails.all, 'detail'] as const,
        detail:  (id: string) => [...queryKeys.cocktails.details(), id] as const,
    },
    ingredients: {
        all:     ['ingredients'] as const,
        lists:   () => [...queryKeys.ingredients.all, 'list'] as const,
        list:    (params: ListParams) => [...queryKeys.ingredients.lists(), params] as const,
        details: () => [...queryKeys.ingredients.all, 'detail'] as const,
        detail:  (id: string) => [...queryKeys.ingredients.details(), id] as const,
    },
    ratings: {
        all:    ['ratings'] as const,
        lists:  () => [...queryKeys.ratings.all, 'list'] as const,
        list:   (params: ListParams) => [...queryKeys.ratings.lists(), params] as const,
        detail: (id: string) => [...queryKeys.ratings.all, 'detail', id] as const,
    },
    pantry: {
        all:  ['pantry'] as const,
        list: (params: ListParams = {}) => [...queryKeys.pantry.all, 'list', params] as const,
    },
    pantryStats: {
        all: ['pantry-stats'] as const,
    },
    favorites: {
        all: ['favorites'] as const,
        ids: () => [...queryKeys.favorites.all, 'ids'] as const,
    },
    makeable: {
        all:      ['makeable'] as const,
        list:     (maxMissing: number) => [...queryKeys.makeable.all, { maxMissing }] as const,
        bestRated: () => [...queryKeys.makeable.all, 'best-rated'] as const,
    },
    plannedCocktails: {
        all:    ['planned-cocktails'] as const,
        lists:  () => [...queryKeys.plannedCocktails.all, 'list'] as const,
        list:   (params: ListParams) => [...queryKeys.plannedCocktails.lists(), params] as const,
        byUser: (userId: string) => [...queryKeys.plannedCocktails.all, 'user', userId] as const,
        detail: (id: string) => [...queryKeys.plannedCocktails.all, 'detail', id] as const,
        exists: (cocktailId: string) => [...queryKeys.plannedCocktails.all, 'exists', cocktailId] as const,
    },
    smartCollections: {
        all:    ['smart-collections'] as const,
        list:   () => [...queryKeys.smartCollections.all, 'list'] as const,
        detail: (slug: string) => [...queryKeys.smartCollections.all, 'detail', slug] as const,
    },
    plannedCollections: {
        all:    ['planned-collections'] as const,
        lists:  () => [...queryKeys.plannedCollections.all, 'list'] as const,
        list:   (params: ListParams) => [...queryKeys.plannedCollections.lists(), params] as const,
        detail: (id: string) => [...queryKeys.plannedCollections.all, 'detail', id] as const,
        grocery: (id: string) => [...queryKeys.plannedCollections.all, 'grocery', id] as const,
    },
    cocktailMadeLogs: {
        all:    ['cocktail-made-logs'] as const,
        list:   (params: ListParams) => [...queryKeys.cocktailMadeLogs.all, 'list', params] as const,
        byUser: (userId: string) => [...queryKeys.cocktailMadeLogs.all, 'user', userId] as const,
    },
    barTools: {
        all:    ['bar-tools'] as const,
        lists:  () => [...queryKeys.barTools.all, 'list'] as const,
        list:   (params: ListParams) => [...queryKeys.barTools.lists(), params] as const,
        detail: (id: string) => [...queryKeys.barTools.all, 'detail', id] as const,
    },
    glasses: {
        all:    ['glasses'] as const,
        lists:  () => [...queryKeys.glasses.all, 'list'] as const,
        list:   (params: ListParams) => [...queryKeys.glasses.lists(), params] as const,
        detail: (id: string) => [...queryKeys.glasses.all, 'detail', id] as const,
    },
    ingredientTypes: {
        all:    ['ingredient-types'] as const,
        lists:  () => [...queryKeys.ingredientTypes.all, 'list'] as const,
        list:   (params: ListParams) => [...queryKeys.ingredientTypes.lists(), params] as const,
        detail: (id: string) => [...queryKeys.ingredientTypes.all, 'detail', id] as const,
    },
    ingredientSubTypes: {
        all:    ['ingredient-subtypes'] as const,
        lists:  () => [...queryKeys.ingredientSubTypes.all, 'list'] as const,
        list:   (params: ListParams) => [...queryKeys.ingredientSubTypes.lists(), params] as const,
        detail: (id: string) => [...queryKeys.ingredientSubTypes.all, 'detail', id] as const,
    },
    adminStats: {
        all: ['admin-stats'] as const,
    },
    recommendations: {
        all: ['recommendations'] as const,
    },
    userStats: {
        all: ['user-stats'] as const,
    },
    derivations: {
        all: ['derivations'] as const,
    },
    makeablePreview: (ids: string[], cocktailId?: string) => ['makeable-preview', [...ids].sort(), cocktailId ?? null] as const,
    demoBottles: ['demo-bottles'] as const,
    rsvps: {
        mine: ['rsvps', 'mine'] as const,
    },
} as const
