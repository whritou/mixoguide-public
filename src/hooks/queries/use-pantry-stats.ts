'use client'

import { useQuery } from '@tanstack/react-query'
import { pantryApi } from '@/lib/api/pantry.api'
import { queryKeys } from '@/lib/query-keys'

export function usePantryStatsQuery(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.pantryStats.all,
        queryFn: () => pantryApi.stats(),
        enabled: options?.enabled ?? true,
        refetchOnWindowFocus: false,
    })
}
