import { api } from './fetcher'
import { mapBarTool, mapBarTools } from '@/lib/mappers/bartool.mapper'
import type { BarTool, BarToolDTO } from '@/types/models/bartool'
import type { ListParams } from '@/lib/query-keys'

export const barToolsApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<BarToolDTO>('bar-tools', params)
        return { items: mapBarTools(res.data), meta: res.meta }
    },
    get: async (id: string) => {
        const res = await api.getOne<BarToolDTO>('bar-tools', id)
        return mapBarTool(res.data)
    },
    create: async (data: Partial<BarTool>) => {
        const res = await api.post<BarToolDTO, Partial<BarTool>>('bar-tools', data)
        return mapBarTool(res.data)
    },
    update: async (id: string, data: Partial<BarTool>) => {
        const res = await api.put<BarToolDTO, Partial<BarTool>>(`bar-tools/${id}`, data)
        return mapBarTool(res.data)
    },
    remove: (id: string) => api.delete(`bar-tools/${id}`),
}
