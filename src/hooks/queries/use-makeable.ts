'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { makeableApi } from '@/lib/api/makeable.api'
import { pantryApi } from '@/lib/api/pantry.api'
import { queryKeys } from '@/lib/query-keys'

export function useMakeableCocktailsQuery(maxMissing = 3) {
    const { status } = useSession()
    const authed = status === 'authenticated'

    // refetchOnWindowFocus is disabled on these two: makeable is expensive
    // (loads pantry + filters hundreds of cocktails in JS) and pantry is its
    // dependency. Users can pull-to-refresh manually if needed.
    const pantry = useQuery({
        queryKey: queryKeys.pantry.list(),
        queryFn:  () => pantryApi.list(),
        enabled:  authed,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    })

    const makeable = useQuery({
        queryKey: queryKeys.makeable.list(maxMissing),
        queryFn:  () => makeableApi.list(maxMissing),
        enabled:  authed && pantry.isSuccess,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    })

    return {
        cocktails: makeable.data ?? [],
        loading:   pantry.isLoading || makeable.isLoading,
        error:     (makeable.error as Error | null)?.message ?? null,
        reload:    () => makeable.refetch(),
    }
}

export function useBestRatedMakeableQuery() {
    return useQuery({
        queryKey: queryKeys.makeable.bestRated(),
        queryFn:  makeableApi.bestRated,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    })
}
