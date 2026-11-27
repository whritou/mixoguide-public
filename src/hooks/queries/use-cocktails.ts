'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { cocktailsApi } from '@/lib/api/cocktails.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'
import { nextOffset } from '@/lib/api/pagination'

export function useCocktailsQuery(params: ListParams = {}) {
    return useQuery({
        queryKey: queryKeys.cocktails.list(params),
        queryFn:  () => cocktailsApi.list(params),
    })
}

/**
 * Offset-paginated cocktail list. The query key is the filter set (without
 * offset), so a filter change starts a fresh list in the same render — no
 * offset-reset effect and no request for a stale offset (PERF-005).
 */
export function useInfiniteCocktailsQuery(
    params: ListParams,
    options: { pageSize?: number; enabled?: boolean } = {},
) {
    const pageSize = options.pageSize ?? 20
    return useInfiniteQuery({
        queryKey: queryKeys.cocktails.infinite({ ...params, limit: pageSize }),
        queryFn:  ({ pageParam }) => cocktailsApi.list({ ...params, limit: pageSize, offset: pageParam }),
        initialPageParam: 0,
        getNextPageParam: nextOffset,
        enabled:  options.enabled ?? true,
    })
}

export function useCocktailQuery(id: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.cocktails.detail(id),
        queryFn:  () => cocktailsApi.get(id),
        enabled:  options?.enabled !== false && Boolean(id),
    })
}
