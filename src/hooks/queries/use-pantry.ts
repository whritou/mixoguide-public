'use client'

import { useQuery } from '@tanstack/react-query'
import { pantryApi } from '@/lib/api/pantry.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

export function usePantryQuery(params: ListParams = {}) {
    return useQuery({
        queryKey: queryKeys.pantry.list(params),
        queryFn:  () => pantryApi.list(params),
        staleTime: 15_000,
        refetchOnWindowFocus: true,
    })
}
