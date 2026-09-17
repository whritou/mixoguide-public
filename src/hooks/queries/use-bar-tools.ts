'use client'

import { useQuery } from '@tanstack/react-query'
import { barToolsApi } from '@/lib/api/bar-tools.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

// Bar tools are admin-managed reference data; safe to cache aggressively.
const STATIC_REF_DATA_OPTS = {
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
} as const

export function useBarToolsQuery(params: ListParams = {}) {
    return useQuery({
        queryKey: queryKeys.barTools.list(params),
        queryFn:  () => barToolsApi.list(params),
        ...STATIC_REF_DATA_OPTS,
    })
}

export function useBarToolQuery(id: string) {
    return useQuery({
        queryKey: queryKeys.barTools.detail(id),
        queryFn:  () => barToolsApi.get(id),
        enabled:  Boolean(id),
        ...STATIC_REF_DATA_OPTS,
    })
}
