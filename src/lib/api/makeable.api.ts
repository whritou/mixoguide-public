import type { MakeableCocktail, MakeablePreview } from '@/types/models/cocktail'
import type { DemoBottle } from '@/lib/demo-bar/demo-bottles'
import { ApiError } from './fetcher'

function unwrapList<T>(data: unknown): T[] {
    if (Array.isArray(data)) return data as T[]
    const inner = (data as { data?: unknown } | null)?.data
    return Array.isArray(inner) ? (inner as T[]) : []
}

export const makeableApi = {
    list: async (maxMissing: number): Promise<MakeableCocktail[]> => {
        const url = `/api/cocktails/makeable?maxMissing=${maxMissing}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) throw new ApiError(res.status, `GET ${url} → ${res.status}`)
        return unwrapList<MakeableCocktail>(await res.json())
    },
    bestRated: async (): Promise<MakeableCocktail[]> => {
        const res = await fetch('/api/cocktails/best-rated-makeable', { cache: 'no-store' })
        if (!res.ok) return []
        return unwrapList<MakeableCocktail>(await res.json())
    },
    /** Public: what a hypothetical shelf of ingredients can make. */
    preview: async (ingredientIds: string[], cocktailId?: string): Promise<MakeablePreview> => {
        const url = '/api/cocktails/makeable-preview'
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredientIds, cocktailId }),
        })
        if (!res.ok) throw new ApiError(res.status, `POST ${url} → ${res.status}`)
        const body = await res.json()
        return body.data as MakeablePreview
    },
    /** Public: curated demo bottles for the landing-page shelf. */
    demoBottles: async (): Promise<DemoBottle[]> => {
        const url = '/api/cocktails/makeable-preview'
        const res = await fetch(url)
        if (!res.ok) throw new ApiError(res.status, `GET ${url} → ${res.status}`)
        const body = await res.json()
        return body.data as DemoBottle[]
    },
}
