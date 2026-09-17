import { api } from '../client'
import type { IngredientDTO } from '@mixoguide/shared'

export interface IngredientSearchResult {
    id:          string
    name:        string
    imageUrl:    string | null
    isAlcoholic: boolean | null
    abv:         number | null
    brand:       string | null
    unit:        string | null
    type?:       { id: string; name: string } | null
    subType?:    { id: string; name: string } | null
    _count?:     { cocktailIngredients: number }
}

export interface IngredientType {
    id:   string
    name: string
}

export interface IngredientSubType {
    id:   string
    name: string
}

export interface IngredientListParams {
    search?:     string
    types?:      string[]
    subTypes?:   string[]
    isAlcoholic?: boolean | null
    sortBy?:     'name' | 'abv'
    sortOrder?:  'asc' | 'desc'
    page?:       number
    limit?:      number
    offset?:     number
}

export interface IngredientListMeta {
    total:            number
    page:             number
    limit:            number
    totalPages:       number
    hasNextPage?:     boolean
    hasPreviousPage?: boolean
}

function buildParams(params: IngredientListParams): Record<string, string | number> {
    const p: Record<string, string | number> = {}
    if (params.search)     p.search    = params.search
    if (params.sortBy)     p.sortBy    = params.sortBy
    if (params.sortOrder)  p.sortOrder = params.sortOrder
    if (params.page)       p.page      = params.page
    if (params.limit)      p.limit     = params.limit
    if (params.offset !== undefined) p.offset = params.offset
    if (params.types?.length)    p.types    = params.types.join(',')
    if (params.subTypes?.length) p.subTypes = params.subTypes.join(',')
    if (params.isAlcoholic !== null && params.isAlcoholic !== undefined) {
        p.alcoholic = String(params.isAlcoholic)
    }
    return p
}

export interface BarcodeProductInfo {
    productName: string | null
    brand:       string | null
    quantity:    string | null
    imageUrl:    string | null
}

export interface BarcodeIngredientCandidate {
    id:          string
    name:        string
    brand:       string | null
    imageUrl:    string | null
    typeName:    string | null
    subTypeName: string | null
}

export interface BarcodeLookupResult {
    barcode:    string
    ingredient: BarcodeIngredientCandidate | null
    candidates: BarcodeIngredientCandidate[]
    product:    BarcodeProductInfo | null
    source:     'cache' | 'off' | 'not-found'
}

export const ingredientsApi = {
    list: (params: IngredientListParams = {}) =>
        api.get<{ success: true; data: IngredientSearchResult[]; meta: IngredientListMeta }>(
            '/api/ingredients',
            { params: { sortBy: 'name', sortOrder: 'asc', limit: 50, ...buildParams(params) } }
        ),

    getById: (id: string) =>
        api.get<{ success: true; data: IngredientDTO }>(`/api/ingredients/${id}`),

    search: (search: string, limit = 20) =>
        api.get<{ success: true; data: IngredientSearchResult[]; meta: IngredientListMeta }>('/api/ingredients', {
            params: { ...(search.trim() ? { search: search.trim() } : {}), limit, sortBy: 'name', sortOrder: 'asc' },
        }),

    lookupBarcode: (barcode: string) =>
        api.get<{ success: true; data: BarcodeLookupResult }>(
            `/api/ingredients/by-barcode/${encodeURIComponent(barcode)}`,
        ),

    confirmBarcode: (barcode: string, ingredientId: string) =>
        api.post<{ success: true }>(
            `/api/ingredients/by-barcode/${encodeURIComponent(barcode)}`,
            { ingredientId },
        ),
}

export const ingredientTypesApi = {
    list: () =>
        api.get<{ success: true; data: IngredientType[]; meta: { total: number } }>('/api/ingredient-types', {
            params: { limit: 200, sortBy: 'name', sortOrder: 'asc' },
        }),
}

export const ingredientSubTypesApi = {
    list: () =>
        api.get<{ success: true; data: IngredientSubType[]; meta: { total: number } }>('/api/ingredient-subtypes', {
            params: { limit: 200, sortBy: 'name', sortOrder: 'asc' },
        }),
}
