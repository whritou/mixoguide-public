import { api } from './fetcher'
import { mapIngredientType, mapIngredientTypes } from '@/lib/mappers/ingredient-type.mapper'
import type { IngredientType, IngredientTypeDTO } from '@/types/models/ingredient-type'
import type { ListParams } from '@/lib/query-keys'

export const ingredientTypesApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<IngredientTypeDTO>('ingredient-types', params)
        return { items: mapIngredientTypes(res.data), meta: res.meta }
    },
    get: async (id: string) => {
        const res = await api.getOne<IngredientTypeDTO>('ingredient-types', id)
        return mapIngredientType(res.data)
    },
    create: async (data: Partial<IngredientType>) => {
        const res = await api.post<IngredientTypeDTO, Partial<IngredientType>>('ingredient-types', data)
        return mapIngredientType(res.data)
    },
    update: async (id: string, data: Partial<IngredientType>) => {
        const res = await api.put<IngredientTypeDTO, Partial<IngredientType>>(`ingredient-types/${id}`, data)
        return mapIngredientType(res.data)
    },
    remove: (id: string) => api.delete(`ingredient-types/${id}`),
}
