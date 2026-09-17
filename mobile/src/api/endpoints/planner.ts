import { api } from '../client'
import type { PlannedCocktailDTO, PlannedCollectionDTO } from '@mixoguide/shared'

export interface GroceryItem {
    ingredientId:   string
    ingredientName: string
    totalNeeded:    number
    unit:           string
    inPantry:       number
    missing:        number
    inWishlist:     boolean
}

interface ListMeta {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
}

// ── Planned cocktails ──────────────────────────────────────────────────────────

export const plannedCocktailsApi = {
    list: () =>
        api.get<{ success: true; data: PlannedCocktailDTO[]; meta: ListMeta }>('/api/planned-cocktails', {
            params: { sortBy: 'plannedFor', sortOrder: 'asc', limit: 100 },
        }),

    create: (payload: { cocktailId: string; plannedFor: string; quantity: number }) =>
        api.post<{ success: true; data: PlannedCocktailDTO }>('/api/planned-cocktails', payload),

    update: (id: string, payload: Partial<{ plannedFor: string; quantity: number; status: string }>) =>
        api.put<{ success: true; data: PlannedCocktailDTO }>(`/api/planned-cocktails/${id}`, payload),

    delete: (id: string) =>
        api.delete(`/api/planned-cocktails/${id}`),

    complete: (id: string) =>
        api.post<{ success: true; data: PlannedCocktailDTO }>(`/api/planned-cocktails/${id}/complete`, {}),
}

// ── Planned collections ────────────────────────────────────────────────────────

export const plannedCollectionsApi = {
    list: () =>
        api.get<{ success: true; data: PlannedCollectionDTO[]; meta: ListMeta }>('/api/planned-collections', {
            params: { sortBy: 'plannedFor', sortOrder: 'asc', limit: 100 },
        }),

    getById: (id: string) =>
        api.get<{ success: true; data: PlannedCollectionDTO }>(`/api/planned-collections/${id}`),

    create: (payload: { title: string; plannedFor: string; servings: number; occasions: string[]; cocktailIds?: string[] }) =>
        api.post<{ success: true; data: PlannedCollectionDTO }>('/api/planned-collections', payload),

    update: (id: string, payload: Partial<{ title: string; plannedFor: string; servings: number; occasions: string[]; status: string }>) =>
        api.put<{ success: true; data: PlannedCollectionDTO }>(`/api/planned-collections/${id}`, payload),

    delete: (id: string) =>
        api.delete(`/api/planned-collections/${id}`),

    complete: (id: string) =>
        api.post<{ success: true; data: PlannedCollectionDTO }>(`/api/planned-collections/${id}/complete`, {}),

    addCocktail: (id: string, cocktailId: string) =>
        api.post(`/api/planned-collections/${id}/cocktails`, { cocktailId }),

    removeCocktail: (id: string, cocktailId: string) =>
        api.delete(`/api/planned-collections/${id}/cocktails/${cocktailId}`),

    completeCocktail: (id: string, cocktailId: string) =>
        api.post<{ success: true; data: PlannedCollectionDTO }>(
            `/api/planned-collections/${id}/cocktails/${cocktailId}/complete`,
            {},
        ),

    getGroceryList: (id: string) =>
        api.get<{ success: true; data: GroceryItem[] }>(`/api/planned-collections/${id}/grocery`),

    addIngredients: (
        id: string,
        items: { ingredientId: string; destination: 'shopping' | 'pantry'; quantity: number; unit: string }[]
    ) =>
        api.post<{ success: true; data: { addedToShopping: number; addedToPantry: number } }>(
            `/api/planned-collections/${id}/add-ingredients`,
            { items }
        ),
}
