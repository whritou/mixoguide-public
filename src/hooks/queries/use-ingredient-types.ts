'use client'

import { useQuery } from '@tanstack/react-query'
import { ingredientTypesApi } from '@/lib/api/ingredient-types.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

// Ingredient types are admin-managed reference data; safe to cache aggressively.
const STATIC_REF_DATA_OPTS = {
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
} as const

export function useIngredientTypesQuery(params: ListParams = {}) {
    return useQuery({
        queryKey: queryKeys.ingredientTypes.list(params),
        queryFn:  () => ingredientTypesApi.list(params),
        ...STATIC_REF_DATA_OPTS,
    })
}

export function useIngredientTypeQuery(id: string) {
    return useQuery({
        queryKey: queryKeys.ingredientTypes.detail(id),
        queryFn:  () => ingredientTypesApi.get(id),
        enabled:  Boolean(id),
        ...STATIC_REF_DATA_OPTS,
    })
}
