import type { MakeableCocktail } from '@/types/models/cocktail'

export const makeableApi = {
    list: async (maxMissing: number): Promise<MakeableCocktail[]> => {
        const res = await fetch(`/api/cocktails/makeable?maxMissing=${maxMissing}`, { cache: 'no-store' })
        if (res.status === 401) throw new Error('unauthenticated')
        if (!res.ok) throw new Error('Failed to load makeable cocktails')
        const data = await res.json()
        return Array.isArray(data) ? data : (data.data ?? [])
    },
    bestRated: async (): Promise<MakeableCocktail[]> => {
        const res = await fetch('/api/cocktails/best-rated-makeable', { cache: 'no-store' })
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : (data.data ?? [])
    },
}
