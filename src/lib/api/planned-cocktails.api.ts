import { api } from './fetcher'
import { mapPlannedCocktail, mapPlannedCocktails } from '@/lib/mappers/planned-cocktail.mapper'
import type { PlannedCocktail, PlannedCocktailDTO } from '@/types/models/planned-cocktail'
import type { ListParams } from '@/lib/query-keys'

export const plannedCocktailsApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<PlannedCocktailDTO>('planned-cocktails', params)
        const data = Array.isArray(res.data) ? res.data : []
        return { items: mapPlannedCocktails(data), meta: res.meta }
    },
    byUser: async (userId: string) => {
        const res = await api.getList<PlannedCocktailDTO>(`user/${userId}/planned-cocktails`)
        const data = Array.isArray(res.data) ? res.data : []
        return { items: mapPlannedCocktails(data), meta: res.meta }
    },
    create: async (data: Partial<PlannedCocktail>) => {
        const res = await api.post<PlannedCocktailDTO, Partial<PlannedCocktail>>('planned-cocktails', data)
        return mapPlannedCocktail(res.data)
    },
    update: async (id: string, data: Partial<PlannedCocktail>) => {
        const res = await api.put<PlannedCocktailDTO, Partial<PlannedCocktail>>(`planned-cocktails/${id}`, data)
        return mapPlannedCocktail(res.data)
    },
    remove:   (id: string) => api.delete(`planned-cocktails/${id}`),
    complete: async (id: string) => {
        const res = await api.post<PlannedCocktailDTO, Record<string, never>>(`planned-cocktails/${id}/complete`, {})
        return mapPlannedCocktail(res.data)
    },
    exists: async (cocktailId: string): Promise<boolean> => {
        const res = await fetch(`/api/planned-cocktails/exist?cocktailId=${cocktailId}`)
        if (!res.ok) return false
        const json = await res.json()
        return Boolean(json.data?.exists)
    },
}
