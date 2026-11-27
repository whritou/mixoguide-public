'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MakeablePreview } from '@/types/models/cocktail'
import { makeableApi } from '@/lib/api/makeable.api'
import { queryKeys } from '@/lib/query-keys'

const DEBOUNCE_MS = 250

function useDebouncedValue<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debounced
}

export function useMakeablePreview(ids: string[], cocktailId?: string) {
    const idsKey = [...ids].sort().join(',')
    const debouncedKey = useDebouncedValue(idsKey, DEBOUNCE_MS)
    const debouncedIds = debouncedKey ? debouncedKey.split(',') : []

    const query = useQuery({
        queryKey: queryKeys.makeablePreview(debouncedIds, cocktailId),
        queryFn: () => makeableApi.preview(debouncedIds, cocktailId),
        enabled: debouncedIds.length > 0,
        placeholderData: debouncedIds.length > 0 ? (previous: MakeablePreview | undefined) => previous : undefined,
        refetchOnWindowFocus: false,
    })
    return { ...query, isCurrent: query.isSuccess && !query.isPlaceholderData && debouncedKey === idsKey }
}

export function useDemoBottles() {
    return useQuery({
        queryKey: queryKeys.demoBottles,
        queryFn: makeableApi.demoBottles,
        staleTime: 60 * 60 * 1000,
        refetchOnWindowFocus: false,
    })
}
