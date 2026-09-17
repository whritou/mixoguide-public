'use client'

import { useQuery } from '@tanstack/react-query'
import { ingredientsApi } from '@/lib/api/ingredients.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

// Ingredients are admin-managed reference data; changes are rare.
// Shorter staleTime than glasses/types since admins do edit ingredients more
// often (brands, abv, images), but still safe to skip on-focus refetch.
const INGREDIENT_QUERY_OPTS = {
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
} as const

export function useIngredientsQuery(params: ListParams = {}) {
    return useQuery({
        queryKey: queryKeys.ingredients.list(params),
        queryFn:  () => ingredientsApi.list(params),
        ...INGREDIENT_QUERY_OPTS,
    })
}

export function useIngredientQuery(id: string) {
    return useQuery({
        queryKey: queryKeys.ingredients.detail(id),
        queryFn:  () => ingredientsApi.get(id),
        enabled:  Boolean(id),
        ...INGREDIENT_QUERY_OPTS,
    })
}
