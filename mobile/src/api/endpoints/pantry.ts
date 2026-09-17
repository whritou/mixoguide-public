import { api } from '../client'
import type { UserPantryItemDTO } from '@mixoguide/shared'

export interface PantryUpsertPayload {
    ingredientId:    string
    quantity?:       number
    shoppingQuantity?: number
    unitLeft?:       string
    isInPantry?:     boolean
    isInShoppingList?: boolean
    note?:           string
    favorite?:       boolean
    isEssential?:    boolean
    isInfinite?:     boolean
    expirationDate?: string | null
}

export interface PantryStats {
    totalItems:    number
    pantryItems:   number
    shoppingItems: number
    essentialItems: number
    expiringItems: number
}

export interface RestockPantryPayload {
    ingredientId: string
    quantity: number
    unit: string
}

interface ListMeta {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
}

export const pantryApi = {
    list: (params: { page?: number; limit?: number } = {}) =>
        api.get<{ success: true; data: UserPantryItemDTO[]; meta: ListMeta }>('/api/user-pantry-items', {
            params: { limit: 500, ...params },
        }),

    upsert: (payload: PantryUpsertPayload) =>
        api.post<{ success: true; data: UserPantryItemDTO }>('/api/user-pantry-items', payload),

    update: (id: string, payload: Partial<PantryUpsertPayload>) =>
        api.put<{ success: true; data: UserPantryItemDTO }>(`/api/user-pantry-items/${id}`, payload),

    delete: (id: string) =>
        api.delete(`/api/user-pantry-items/${id}`),

    moveToPantry: (ingredientId: string, amount: number, unitLeft?: string) =>
        api.post<{ success: true; data: UserPantryItemDTO }>('/api/user-pantry-items/move-to-pantry', {
            ingredientId,
            amount,
            unitLeft,
        }),

    restock: (items: RestockPantryPayload[]) =>
        api.post<{ success: true; data: { addedToShopping: number; addedToPantry: number } }>(
            '/api/user-pantry-items/restock',
            { items },
        ),

    stats: () =>
        api.get<{ success: true; data: PantryStats }>('/api/user-pantry-items/stats'),
}
