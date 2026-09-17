'use client'

import { useQuery } from '@tanstack/react-query'
import { userStatsApi } from '@/lib/api/user-stats.api'
import { queryKeys } from '@/lib/query-keys'

export function useUserStatsQuery(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.userStats.all,
        queryFn: () => userStatsApi.get(),
        enabled: options?.enabled ?? true,
        refetchOnWindowFocus: false,
    })
}
