'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export interface SmartCollectionCocktail {
    id:          string
    name:        string
    imageUrl:    string | null
    isAlcoholic: boolean | null
    difficulty:  string
    avgRating:   number | null
    ratingCount: number
}

export interface SmartCollection {
    slug:             string
    title:            string
    subtitle:         string
    icon:             'sparkles' | 'heart' | 'sun' | 'snowflake' | 'coffee' | 'leaf' | 'moon' | 'flame'
    accent:           'caramel' | 'brown' | 'amber' | 'ink' | 'rose' | 'sage'
    defaultServings:  number
    defaultDayOffset: number
    occasions:        string[]
    cocktailCount:    number
    cocktails:        SmartCollectionCocktail[]
}

async function fetchSmartCollections(): Promise<SmartCollection[]> {
    const res = await fetch('/api/smart-collections')
    if (!res.ok) throw new Error('Failed to load smart collections')
    const json = await res.json()
    return json.data ?? []
}

export function useSmartCollectionsQuery() {
    return useQuery({
        queryKey: queryKeys.smartCollections.list(),
        queryFn:  fetchSmartCollections,
        staleTime: 5 * 60 * 1000,
    })
}
