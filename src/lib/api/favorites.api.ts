import { api } from './fetcher'

export const favoritesApi = {
    list: async (): Promise<string[]> => {
        const res = await fetch('/api/user-favorites-cocktail')
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : data.data ?? []
    },
    add:    (cocktailId: string) =>
        api.post<unknown, { cocktailId: string }>('user-favorites-cocktail', { cocktailId }),
    remove: (cocktailId: string) =>
        api.delete(`user-favorites-cocktail/${cocktailId}`),
}
