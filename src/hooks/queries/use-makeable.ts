'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { makeableApi } from '@/lib/api/makeable.api'
import { queryKeys } from '@/lib/query-keys'
import type { MakeableCocktail } from '@/types/models/cocktail'

/**
 * The server caps maxMissing at 10 and sorts by status then missingCount, so the
 * maxMissing=10 result filtered client-side is identical to a narrower request.
 * Every caller shares this single cached computation (PERF-008).
 */
export const MAKEABLE_FETCH_MAX_MISSING = 10

const EMPTY: MakeableCocktail[] = []

export function useMakeableCocktailsQuery(maxMissing = 3) {
    const { status } = useSession()
    const authed = status === 'authenticated'

    // refetchOnWindowFocus is disabled: makeable is expensive (loads the pantry
    // and filters hundreds of cocktails server-side). Previously this waited for
    // a client pantry query to succeed first — an unnecessary waterfall, since the
    // endpoint reads the pantry itself.
    const selectWithin = useCallback(
        (data: MakeableCocktail[]) =>
            maxMissing >= MAKEABLE_FETCH_MAX_MISSING
                ? data
                : data.filter((c) => (c.missingCount ?? 0) <= maxMissing),
        [maxMissing],
    )

    const makeable = useQuery({
        queryKey: queryKeys.makeable.list(MAKEABLE_FETCH_MAX_MISSING),
        queryFn:  () => makeableApi.list(MAKEABLE_FETCH_MAX_MISSING),
        select:   selectWithin,
        enabled:  authed,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    })

    return {
        cocktails: makeable.data ?? EMPTY,
        loading:   makeable.isLoading,
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
