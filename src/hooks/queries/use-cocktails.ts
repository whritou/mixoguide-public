'use client'

import { useQuery } from '@tanstack/react-query'
import { cocktailsApi } from '@/lib/api/cocktails.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

export function useCocktailsQuery(params: ListParams = {}) {
    return useQuery({
        queryKey: queryKeys.cocktails.list(params),
        queryFn:  () => cocktailsApi.list(params),
    })
}

export function useCocktailQuery(id: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.cocktails.detail(id),
        queryFn:  () => cocktailsApi.get(id),
        enabled:  options?.enabled !== false && Boolean(id),
    })
}
