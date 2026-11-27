'use client'

import { useQuery } from '@tanstack/react-query'
import { pantryApi } from '@/lib/api/pantry.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

export function usePantryQuery(params: ListParams = {}, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: queryKeys.pantry.list(params),
        queryFn:  () => pantryApi.list(params),
        enabled:  options.enabled ?? true,
        staleTime: 15_000,
        refetchOnWindowFocus: true,
    })
}
