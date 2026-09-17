import { api } from './fetcher'
import { mapCocktail, mapCocktails } from '@/lib/mappers/cocktail.mapper'
import type { Cocktail, CocktailDTO } from '@/types/models/cocktail'
import type { ListParams } from '@/lib/query-keys'
import type { SyncIngredient } from '@/lib/api/types'

export const cocktailsApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<CocktailDTO>('cocktails', params)
        return { items: mapCocktails(res.data), meta: res.meta }
    },
    get: async (id: string) => {
        const res = await api.getOne<CocktailDTO>('cocktails', id)
        return mapCocktail(res.data)
    },
    create: async (data: Partial<Cocktail>) => {
        const res = await api.post<CocktailDTO, Partial<Cocktail>>('cocktails', data)
        return mapCocktail(res.data)
    },
    update: async (id: string, data: Partial<Cocktail>) => {
        const res = await api.put<CocktailDTO, Partial<Cocktail>>(`cocktails/${id}`, data)
        return mapCocktail(res.data)
    },
    remove: (id: string) => api.delete(`cocktails/${id}`),
    syncIngredients: (id: string, ingredients: SyncIngredient[]) =>
        api.put<unknown, { ingredients: SyncIngredient[] }>(`cocktails/${id}/ingredients`, { ingredients }),
    syncBarTools: (id: string, ids: string[]) =>
        api.put<unknown, { ids: string[] }>(`cocktails/${id}/bar-tools`, { ids }),
    make: (id: string) =>
        api.post<unknown, Record<string, never>>(`cocktails/${id}/make`, {}),
}
