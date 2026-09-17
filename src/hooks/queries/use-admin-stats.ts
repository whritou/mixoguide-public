'use client'

import { useQuery } from '@tanstack/react-query'
import { adminStatsApi } from '@/lib/api/admin-stats.api'
import { queryKeys } from '@/lib/query-keys'

export function useAdminStatsQuery() {
    return useQuery({
        queryKey: queryKeys.adminStats.all,
        queryFn:  () => adminStatsApi.get(),
    })
}
