import { api } from '../client'
import type { CocktailDTO, MakeableCocktail } from '@mixoguide/shared'

export interface CocktailListParams {
    search?: string
    difficulty?: string | null
    isAlcoholic?: boolean | null
    flavors?: string[]
    occasions?: string[]
    onlyFavorites?: boolean
    favoriteIds?: string[]
    makeableIds?: string[]
    sortBy?: string | null
    sortOrder?: 'asc' | 'desc'
    includeIngredients?: boolean
    page?: number
    limit?: number
}

export interface PaginatedResponse<T> {
    data: T[]
    meta: { total: number; page: number; limit: number; totalPages: number }
}

function buildParams(filters: CocktailListParams): Record<string, string> {
    const p: Record<string, string> = {}

    if (filters.search)       p.search     = filters.search
    if (filters.difficulty)   p.difficulty = filters.difficulty
    if (filters.sortBy)       p.sortBy     = filters.sortBy
    if (filters.sortOrder)    p.sortOrder  = filters.sortOrder ?? 'desc'
    if (filters.page)         p.page       = String(filters.page)
    if (filters.limit)        p.limit      = String(filters.limit)
    if (filters.includeIngredients) p.include = 'ingredients'

    if (filters.isAlcoholic !== null && filters.isAlcoholic !== undefined) {
        p.alcoholic = String(filters.isAlcoholic)
    }
    if (filters.flavors?.length)   p.flavors   = filters.flavors.join(',')
    if (filters.occasions?.length) p.occasions = filters.occasions.join(',')

    if (filters.makeableIds) {
        p.makeableIds = filters.makeableIds.length > 0
            ? filters.makeableIds.join(',')
            : '__none__'
    }

    if (filters.onlyFavorites && filters.favoriteIds) {
        p.favoriteIds = filters.favoriteIds.length > 0
            ? filters.favoriteIds.join(',')
            : '__none__'
    }

    return p
}

export const cocktailsApi = {
    list: (filters: CocktailListParams = {}) =>
        api.get<{ success: true } & PaginatedResponse<CocktailDTO>>('/api/cocktails', {
            params: buildParams({ limit: 20, ...filters }),
        }),

    getById: (id: string) =>
        api.get<{ success: true; data: CocktailDTO }>(`/api/cocktails/${id}`),

    makeable: (maxMissing = 3) =>
        api.get<{ success: true; data: MakeableCocktail[] }>('/api/cocktails/makeable', {
            params: { maxMissing },
        }),

    // Favorites
    getFavoriteIds: () =>
        api.get<{ success: true; data: string[] }>('/api/user-favorites-cocktail'),

    addFavorite: (cocktailId: string) =>
        api.post('/api/user-favorites-cocktail', { cocktailId }),

    removeFavorite: (cocktailId: string) =>
        api.delete(`/api/user-favorites-cocktail/${cocktailId}`),

    // Rating
    upsertRating: (cocktailId: string, rating: number) =>
        api.post(`/api/ratings/${cocktailId}`, { rating }),

    deleteRating: (cocktailId: string) =>
        api.delete(`/api/ratings/${cocktailId}`),

    getUserRating: (cocktailId: string) =>
        api.get<{ success: true; data: { ratings: { userId: string; rating: number }[]; stats: unknown } }>(
            `/api/ratings/${cocktailId}`
        ),

    // Mark as made
    makeNow: (cocktailId: string, quantity = 1) =>
        api.post(`/api/cocktails/${cocktailId}/make`, { quantity }),

    // Add ingredients to pantry/shopping
    addIngredients: (
        cocktailId: string,
        items: { ingredientId: string; destination: 'shopping' | 'pantry'; quantity: number; unit: string }[]
    ) =>
        api.post<{ success: true; data: { addedToShopping: number; addedToPantry: number } }>(
            `/api/cocktails/${cocktailId}/add-ingredients`,
            { items }
        ),
}
