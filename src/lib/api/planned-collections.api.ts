import { api } from './fetcher'
import { mapPlannedCollection, mapPlannedCollections } from '@/lib/mappers/planned-collection.mapper'
import type { PlannedCollection, PlannedCollectionDTO } from '@/types/models/planned-collection'
import type { ListParams } from '@/lib/query-keys'
import type { GroceryItem } from '@/utils/groceryCalculator'

export type PlannedCollectionCreatePayload = Partial<PlannedCollection> & {
    cocktailIds?: string[]
}

export const plannedCollectionsApi = {
    list: async (params: ListParams = {}) => {
        const res = await api.getList<PlannedCollectionDTO>('planned-collections', params)
        return { items: mapPlannedCollections(res.data), meta: res.meta }
    },
    get: async (id: string) => {
        const res = await api.getOne<PlannedCollectionDTO>('planned-collections', id)
        return mapPlannedCollection(res.data)
    },
    create: async (data: PlannedCollectionCreatePayload) => {
        const res = await api.post<PlannedCollectionDTO, PlannedCollectionCreatePayload>('planned-collections', data)
        return mapPlannedCollection(res.data)
    },
    update: async (id: string, data: Partial<PlannedCollection>) => {
        const res = await api.put<PlannedCollectionDTO, Partial<PlannedCollection>>(`planned-collections/${id}`, data)
        return mapPlannedCollection(res.data)
    },
    remove:   (id: string) => api.delete(`planned-collections/${id}`),
    complete: async (id: string) => {
        const res = await api.post<PlannedCollectionDTO, Record<string, never>>(`planned-collections/${id}/complete`, {})
        return mapPlannedCollection(res.data)
    },
    grocery: async (id: string): Promise<GroceryItem[]> => {
        const res = await api.getList<GroceryItem>(`planned-collections/${id}/grocery`)
        return res.data ?? []
    },
    addCocktail: (id: string, cocktailId: string) =>
        api.post<unknown, { cocktailId: string }>(`planned-collections/${id}/cocktails`, { cocktailId }),
    removeCocktail: (id: string, cocktailId: string) =>
        api.delete(`planned-collections/${id}/cocktails/${cocktailId}`),
    completeCocktail: async (id: string, cocktailId: string) => {
        const res = await api.post<PlannedCollectionDTO, Record<string, never>>(
            `planned-collections/${id}/cocktails/${cocktailId}/complete`,
            {}
        )
        return mapPlannedCollection(res.data)
    },
    generateShareToken: async (id: string): Promise<{ shareToken: string; shareEnabled: boolean }> => {
        const res = await api.post<{ shareToken: string; shareEnabled: boolean }, Record<string, never>>(
            `planned-collections/${id}/share`, {}
        )
        return res.data
    },
    revokeShareToken: (id: string) => api.delete(`planned-collections/${id}/share`),
    sendInvite: (id: string, email: string) =>
        api.post<unknown, { email: string }>(`planned-collections/${id}/invite`, { email }),
}
