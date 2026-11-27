import { api } from './fetcher'
import { mapRating, mapRatings } from '@/lib/mappers/rating.mapper'
import type { Rating } from '@/types/models/rating'
import type { ListParams } from '@/lib/query-keys'

export type RatingStats = { avg: number | null; count: number }

interface CocktailRatingsResponse {
    stats?: { average?: number | null; count?: number | null } | null
}

export const ratingsApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<Rating>('ratings', params)
        return { items: mapRatings(res.data), meta: res.meta }
    },
    create: async (data: Partial<Rating>) => {
        const res = await api.post<Rating, Partial<Rating>>('ratings', data)
        return mapRating(res.data)
    },
    update: async (id: string, data: Partial<Rating>) => {
        const res = await api.put<Rating, Partial<Rating>>(`ratings/${id}`, data)
        return mapRating(res.data)
    },
    remove: (id: string) => api.delete(`ratings/${id}`),

    /** Aggregate rating for one cocktail (GET /api/ratings/:cocktailId). */
    statsFor: async (cocktailId: string): Promise<RatingStats> => {
        const res = await api.getOne<CocktailRatingsResponse>('ratings', cocktailId)
        const s = res.data?.stats
        return { avg: s?.average ?? null, count: s?.count ?? 0 }
    },
    /** Create or update the current user's rating (1–5) for a cocktail. */
    rate: (cocktailId: string, rating: number) =>
        api.post<Rating, { rating: number }>(`ratings/${cocktailId}`, { rating }),
    /** Remove the current user's rating for a cocktail. */
    unrate: (cocktailId: string) => api.delete(`ratings/${cocktailId}`),
}
