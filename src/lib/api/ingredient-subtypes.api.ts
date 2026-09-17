import { api } from './fetcher'
import { mapIngredientSubType, mapIngredientSubTypes } from '@/lib/mappers/ingredient-sub-type.mapper'
import type { IngredientSubType, IngredientSubTypeDTO } from '@/types/models/ingredient-sub-type'
import type { ListParams } from '@/lib/query-keys'

export const ingredientSubTypesApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<IngredientSubTypeDTO>('ingredient-subtypes', params)
        return { items: mapIngredientSubTypes(res.data), meta: res.meta }
    },
    get: async (id: string) => {
        const res = await api.getOne<IngredientSubTypeDTO>('ingredient-subtypes', id)
        return mapIngredientSubType(res.data)
    },
    create: async (data: Partial<IngredientSubType>) => {
        const res = await api.post<IngredientSubTypeDTO, Partial<IngredientSubType>>('ingredient-subtypes', data)
        return mapIngredientSubType(res.data)
    },
    update: async (id: string, data: Partial<IngredientSubType>) => {
        const res = await api.put<IngredientSubTypeDTO, Partial<IngredientSubType>>(`ingredient-subtypes/${id}`, data)
        return mapIngredientSubType(res.data)
    },
    remove: (id: string) => api.delete(`ingredient-subtypes/${id}`),
}
