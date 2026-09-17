'use client'

import { useQuery } from '@tanstack/react-query'
import { favoritesApi } from '@/lib/api/favorites.api'
import { queryKeys } from '@/lib/query-keys'

export function useFavoritesQuery() {
    return useQuery({
        queryKey: queryKeys.favorites.ids(),
        queryFn:  favoritesApi.list,
        staleTime: 15_000,
        refetchOnWindowFocus: true,
    })
}

export function useIsFavorite(cocktailId: string): boolean {
    const { data } = useFavoritesQuery()
    return Boolean(data?.includes(cocktailId))
}
