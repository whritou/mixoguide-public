'use client'

import { useQuery } from '@tanstack/react-query'
import { ingredientSubTypesApi } from '@/lib/api/ingredient-subtypes.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

// Ingredient subtypes are admin-managed reference data; safe to cache aggressively.
const STATIC_REF_DATA_OPTS = {
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
} as const

export function useIngredientSubTypesQuery(params: ListParams = {}) {
    return useQuery({
        queryKey: queryKeys.ingredientSubTypes.list(params),
        queryFn:  () => ingredientSubTypesApi.list(params),
        ...STATIC_REF_DATA_OPTS,
    })
}

export function useIngredientSubTypeQuery(id: string) {
    return useQuery({
        queryKey: queryKeys.ingredientSubTypes.detail(id),
        queryFn:  () => ingredientSubTypesApi.get(id),
        enabled:  Boolean(id),
        ...STATIC_REF_DATA_OPTS,
    })
}
