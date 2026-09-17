import { api } from './fetcher'
import { mapRating, mapRatings } from '@/lib/mappers/rating.mapper'
import type { Rating } from '@/types/models/rating'
import type { ListParams } from '@/lib/query-keys'

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
}
