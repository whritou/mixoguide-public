'use client'

import { useFavoritesQuery, useIsFavorite } from '@/hooks/queries/use-favorites'
import { useFavoriteMutations } from '@/hooks/mutations/use-favorite-mutations'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export function useFavorites() {
    const qc = useQueryClient()
    const { data: ids = [], isLoading: loading } = useFavoritesQuery()
    const { toggle: toggleMutation } = useFavoriteMutations()

    const toggle = (cocktailId: string) => {
        const current = qc.getQueryData<string[]>(queryKeys.favorites.ids()) ?? []
        const isFav = current.includes(cocktailId)
        return toggleMutation.mutateAsync({ cocktailId, isFav })
    }

    const isFavorite = (cocktailId: string) => ids.includes(cocktailId)
    const invalidate  = () => qc.invalidateQueries({ queryKey: queryKeys.favorites.all })

    return { ids, loading, toggle, isFavorite, invalidate }
}

export { useIsFavorite }
