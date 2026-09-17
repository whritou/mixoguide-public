'use client'

import { useQuery } from '@tanstack/react-query'
import { cocktailMadeLogsApi } from '@/lib/api/cocktail-made-logs.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

export function useCocktailMadeLogsQuery(params: ListParams = {}, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.cocktailMadeLogs.list(params),
        queryFn:  () => cocktailMadeLogsApi.list(params),
        enabled:  options?.enabled ?? true,
    })
}
