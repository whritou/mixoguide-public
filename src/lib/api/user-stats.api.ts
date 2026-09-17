import { ApiError } from './fetcher'

export interface UserStatsPayload {
    thisWeek: number
    thisMonth: number
    thisYear: number
    allTime: number
    currentStreak: number
    longestStreak: number
    topCocktails: Array<{ cocktailId: string; name: string; imageUrl: string | null; count: number; archived: boolean }>
    weeklyTrend: Array<{ label: string; drinks: number }>
    monthlyTrend: Array<{ label: string; drinks: number }>
}

export const userStatsApi = {
    get: async (): Promise<UserStatsPayload | null> => {
        const res = await fetch('/api/user/stats')
        if (!res.ok) throw new ApiError(res.status, `GET /api/user/stats -> ${res.status}`)
        const json = await res.json()
        return json.data ?? null
    },
}
