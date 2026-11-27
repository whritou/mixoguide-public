'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MakeablePreview } from '@/types/models/cocktail'
import type { DemoBottle } from '@/lib/demo-bar/demo-bottles'
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

async function unwrap<T>(res: Response, message: string): Promise<T> {
    if (!res.ok) throw new Error(message)
    const body = await res.json()
    return body.data as T
}

export function useMakeablePreview(ids: string[], cocktailId?: string) {
    const idsKey = [...ids].sort().join(',')
    const debouncedKey = useDebouncedValue(idsKey, DEBOUNCE_MS)
    const debouncedIds = debouncedKey ? debouncedKey.split(',') : []

    const query = useQuery({
        queryKey: queryKeys.makeablePreview(debouncedIds, cocktailId),
        queryFn: async () =>
            unwrap<MakeablePreview>(
                await fetch('/api/cocktails/makeable-preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ingredientIds: debouncedIds, cocktailId }),
                }),
                'Failed to load preview',
            ),
        enabled: debouncedIds.length > 0,
        placeholderData: debouncedIds.length > 0 ? (previous: MakeablePreview | undefined) => previous : undefined,
        refetchOnWindowFocus: false,
    })
    return { ...query, isCurrent: query.isSuccess && !query.isPlaceholderData && debouncedKey === idsKey }
}

export function useDemoBottles() {
    return useQuery({
        queryKey: queryKeys.demoBottles,
        queryFn: async () =>
            unwrap<DemoBottle[]>(await fetch('/api/cocktails/makeable-preview'), 'Failed to load demo bottles'),
        staleTime: 60 * 60 * 1000,
        refetchOnWindowFocus: false,
    })
}
