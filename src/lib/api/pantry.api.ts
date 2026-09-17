import { api, ApiError } from './fetcher'
import { mapPantryItem, mapPantryItems } from '@/lib/mappers/pantry.mapper'
import type { UserPantryItem, UserPantryItemDTO } from '@/types/models/pantry'
import type { ListParams } from '@/lib/query-keys'

export interface UpsertPantryData {
    ingredientId:      string
    quantity:          number
    unitLeft:          string
    favorite?:         boolean
    isEssential?:      boolean
    isInfinite?:       boolean
    isInPantry?:       boolean
    isInShoppingList?: boolean
    expirationDate?:   string | null
    note?:             string | null
}

export interface UpdatePantryData {
    quantity?:          number
    shoppingQuantity?:  number
    unitLeft?:          string
    favorite?:          boolean
    isEssential?:       boolean
    isInfinite?:        boolean
    isInPantry?:        boolean
    isInShoppingList?:  boolean
    expirationDate?:    string | null
    note?:              string | null
}

export interface PantryStats {
    total: number
    low: number
    out: number
    toBuy: number
    categories: Array<{ name: string; count: number }>
}

export interface RestockPantryItemInput {
    ingredientId: string
    quantity: number
    unit: string
}

export type PantryListCache = {
    items: UserPantryItem[]
    meta:  {
        total?: number
        page?: number
        limit?: number
        totalPages?: number
        hasNextPage?: boolean
        hasPreviousPage?: boolean
    }
}

export const pantryApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<UserPantryItemDTO>('user-pantry-items', params)
        return { items: mapPantryItems(res.data ?? []), meta: res.meta ?? {} }
    },
    add: async (data: UpsertPantryData) => {
        const res = await api.post<UserPantryItemDTO, UpsertPantryData>('user-pantry-items', data)
        return mapPantryItem(res.data)
    },
    update: async (id: string, data: UpdatePantryData) => {
        const res = await api.put<UserPantryItemDTO, UpdatePantryData>(`user-pantry-items/${id}`, data)
        return mapPantryItem(res.data)
    },
    moveToPantry: async (ingredientId: string, amount: number, unitLeft?: string) => {
        const res = await api.post<UserPantryItemDTO, { ingredientId: string; amount: number; unitLeft?: string }>(
            'user-pantry-items/move-to-pantry',
            { ingredientId, amount, unitLeft },
        )
        return mapPantryItem(res.data)
    },
    restock: async (items: RestockPantryItemInput[]) => {
        const res = await api.post<{ addedToShopping: number; addedToPantry: number }, { items: RestockPantryItemInput[] }>(
            'user-pantry-items/restock',
            { items },
        )
        return res.data
    },
    remove: (id: string) => api.delete(`user-pantry-items/${id}`),
    stats: async (): Promise<PantryStats> => {
        const res = await fetch('/api/user-pantry-items/stats')
        if (!res.ok) throw new ApiError(res.status, `GET /api/user-pantry-items/stats -> ${res.status}`)
        const json = await res.json()
        return json.data ?? {
            total: 0,
            low: 0,
            out: 0,
            toBuy: 0,
            categories: [],
        }
    },
}
