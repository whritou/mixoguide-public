'use client'

import { useQuery } from '@tanstack/react-query'
import { glassesApi } from '@/lib/api/glasses.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

// Glasses are admin-managed reference data; safe to cache aggressively.
const STATIC_REF_DATA_OPTS = {
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
} as const

export function useGlassesQuery(params: ListParams = {}) {
    return useQuery({
        queryKey: queryKeys.glasses.list(params),
        queryFn:  () => glassesApi.list(params),
        ...STATIC_REF_DATA_OPTS,
    })
}

export function useGlassQuery(id: string) {
    return useQuery({
        queryKey: queryKeys.glasses.detail(id),
        queryFn:  () => glassesApi.get(id),
        enabled:  Boolean(id),
        ...STATIC_REF_DATA_OPTS,
    })
}
