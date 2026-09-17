import { api } from './fetcher'
import { mapGlass, mapGlasses } from '@/lib/mappers/glass.mapper'
import type { Glass, GlassDTO } from '@/types/models/glass'
import type { ListParams } from '@/lib/query-keys'

export const glassesApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<GlassDTO>('glasses', params)
        return { items: mapGlasses(res.data), meta: res.meta }
    },
    get: async (id: string) => {
        const res = await api.getOne<GlassDTO>('glasses', id)
        return mapGlass(res.data)
    },
    create: async (data: Partial<Glass>) => {
        const res = await api.post<GlassDTO, Partial<Glass>>('glasses', data)
        return mapGlass(res.data)
    },
    update: async (id: string, data: Partial<Glass>) => {
        const res = await api.put<GlassDTO, Partial<Glass>>(`glasses/${id}`, data)
        return mapGlass(res.data)
    },
    remove: (id: string) => api.delete(`glasses/${id}`),
}
