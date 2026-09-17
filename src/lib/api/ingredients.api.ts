import { api } from './fetcher'
import { mapIngredient, mapIngredients } from '@/lib/mappers/ingredient.mapper'
import type { Ingredient, IngredientDTO } from '@/types/models/ingredient'
import type { ListParams } from '@/lib/query-keys'

export const ingredientsApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<IngredientDTO>('ingredients', params)
        return { items: mapIngredients(res.data), meta: res.meta }
    },
    get: async (id: string) => {
        const res = await api.getOne<IngredientDTO>('ingredients', id)
        return mapIngredient(res.data)
    },
    create: async (data: Partial<Ingredient>) => {
        const res = await api.post<IngredientDTO, Partial<Ingredient>>('ingredients', data)
        return mapIngredient(res.data)
    },
    update: async (id: string, data: Partial<Ingredient>) => {
        const res = await api.put<IngredientDTO, Partial<Ingredient>>(`ingredients/${id}`, data)
        return mapIngredient(res.data)
    },
    remove: (id: string) => api.delete(`ingredients/${id}`),
}
