'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { favoritesApi } from '@/lib/api/favorites.api'
import { queryKeys } from '@/lib/query-keys'
import { invalidators } from '@/lib/invalidation'

export function useFavoriteMutations() {
    const qc = useQueryClient()

    const toggle = useMutation({
        mutationFn: ({ cocktailId, isFav }: { cocktailId: string; isFav: boolean }) =>
            isFav ? favoritesApi.remove(cocktailId) : favoritesApi.add(cocktailId),
        onMutate: async ({ cocktailId, isFav }) => {
            await qc.cancelQueries({ queryKey: queryKeys.favorites.all })
            const prev = qc.getQueryData<string[]>(queryKeys.favorites.ids()) ?? []
            qc.setQueryData<string[]>(
                queryKeys.favorites.ids(),
                isFav ? prev.filter((id) => id !== cocktailId) : [...prev, cocktailId],
            )
            return { prev }
        },
        onError: (_e, _v, ctx) => {
            if (ctx?.prev) qc.setQueryData(queryKeys.favorites.ids(), ctx.prev)
        },
        onSettled: () => invalidators.favorites(qc),
    })

    return { toggle }
}
