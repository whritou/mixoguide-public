'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ingredientsApi } from '@/lib/api/ingredients.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'
import { nextOffset } from '@/lib/api/pagination'
import type { Ingredient } from '@/types/models/ingredient'

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

/** Offset-paginated ingredient list keyed by filters (see useInfiniteCocktailsQuery). */
export function useInfiniteIngredientsQuery(params: ListParams, options: { pageSize?: number } = {}) {
    const pageSize = options.pageSize ?? 20
    return useInfiniteQuery({
        queryKey: queryKeys.ingredients.infinite({ ...params, limit: pageSize }),
        queryFn:  ({ pageParam }) => ingredientsApi.list({ ...params, limit: pageSize, offset: pageParam }),
        initialPageParam: 0,
        getNextPageParam: nextOffset,
        ...INGREDIENT_QUERY_OPTS,
    })
}

export type IngredientOption = Pick<Ingredient, 'id' | 'name'>

const selectOptions = (data: { items: Ingredient[] }): IngredientOption[] =>
    data.items.map((ingredient) => ({ id: ingredient.id, name: ingredient.name }))

/**
 * {id, name} options for filter pickers (up to 300 ingredients). Reference data:
 * cached for an hour and kept for a day. Pass `enabled: false` to defer the
 * request off the critical path (e.g. until the browser is idle).
 */
export function useIngredientOptionsQuery(options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: queryKeys.ingredients.list({ limit: 300 }),
        queryFn:  () => ingredientsApi.list({ limit: 300 }),
        select:   selectOptions,
        enabled:  options.enabled ?? true,
        staleTime: 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
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
