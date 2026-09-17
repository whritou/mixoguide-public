import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cocktailsApi, type CocktailListParams } from '@/api/endpoints/cocktails'
import { derivationsApi } from '@/api/endpoints/derivations'
import { keys } from '@/lib/query-keys'
import { noteRatePromptEligibleAction } from '@/lib/ratePrompt'
import { useAuth } from '@/auth/useAuth'
import type { MakeableCocktail } from '@mixoguide/shared'

function getNextListPage(lastPage: { data?: unknown[]; meta?: { page?: number; totalPages?: number } } | undefined) {
    const items = Array.isArray(lastPage?.data) ? lastPage.data : []
    if (items.length === 0) return undefined

    const page = Number(lastPage?.meta?.page ?? 1)
    const totalPages = Number(lastPage?.meta?.totalPages ?? page)
    if (!Number.isFinite(page) || !Number.isFinite(totalPages)) return undefined

    return page < totalPages ? page + 1 : undefined
}

export function useCocktails(filters: CocktailListParams, enabled = true) {
    return useQuery({
        queryKey: keys.cocktails.list(filters),
        queryFn:  () => cocktailsApi.list(filters).then(r => r.data),
        enabled,
        staleTime: 1000 * 60 * 2,
    })
}

export function useInfiniteCocktails(filters: Omit<CocktailListParams, 'page'>) {
    return useInfiniteQuery({
        queryKey:        keys.cocktails.list(filters),
        queryFn:         ({ pageParam }) => cocktailsApi.list({ ...filters, page: pageParam }).then(r => r.data),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => getNextListPage(lastPage),
        staleTime: 1000 * 60 * 2,
    })
}

export function useCocktail(id: string) {
    return useQuery({
        queryKey: keys.cocktails.detail(id),
        queryFn:  () => cocktailsApi.getById(id).then(r => r.data.data),
        enabled:  !!id,
    })
}

export function useFavoriteIds() {
    const { user } = useAuth()
    return useQuery({
        queryKey: keys.favorites.ids,
        queryFn:  () => cocktailsApi.getFavoriteIds().then(r => r.data.data),
        enabled:  !!user,
        staleTime: 1000 * 60 * 5,
    })
}

export function useToggleFavorite() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ cocktailId, isFav }: { cocktailId: string; isFav: boolean }) =>
            isFav
                ? cocktailsApi.removeFavorite(cocktailId)
                : cocktailsApi.addFavorite(cocktailId),
        onMutate: async ({ cocktailId, isFav }) => {
            await qc.cancelQueries({ queryKey: keys.favorites.ids })
            const prev = qc.getQueryData<string[]>(keys.favorites.ids) ?? []
            qc.setQueryData<string[]>(
                keys.favorites.ids,
                isFav ? prev.filter(id => id !== cocktailId) : [...prev, cocktailId]
            )
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(keys.favorites.ids, ctx.prev)
        },
        onSettled: () => qc.invalidateQueries({ queryKey: keys.favorites.ids }),
    })
}

export function useUserRating(cocktailId: string) {
    const { user } = useAuth()
    return useQuery({
        queryKey: keys.ratings.byCocktail(cocktailId),
        queryFn: async () => {
            const res = await cocktailsApi.getUserRating(cocktailId)
            const mine = res.data.data.ratings.find(r => r.userId === user?.id)
            return mine?.rating ?? null
        },
        enabled: !!user && !!cocktailId,
    })
}

export function useUpsertRating() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ cocktailId, rating }: { cocktailId: string; rating: number }) =>
            rating > 0
                ? cocktailsApi.upsertRating(cocktailId, rating)
                : cocktailsApi.deleteRating(cocktailId),
        onSuccess: (_data, { cocktailId }) => {
            qc.invalidateQueries({ queryKey: keys.ratings.byCocktail(cocktailId) })
            qc.invalidateQueries({ queryKey: keys.cocktails.detail(cocktailId) })
            qc.invalidateQueries({ queryKey: keys.stats.all })
        },
    })
}

export function useMakeableCocktails(maxMissing = 3) {
    const { user } = useAuth()
    return useQuery({
        queryKey: [...keys.cocktails.makeable, maxMissing] as const,
        queryFn:  () => cocktailsApi.makeable(maxMissing).then(r => r.data.data as MakeableCocktail[]),
        enabled:  !!user,
        staleTime: 1000 * 60 * 2,
    })
}

export function useDerivations() {
    return useQuery({
        queryKey: keys.derivations.all,
        queryFn:  () => derivationsApi.get(),
        staleTime: Infinity,
    })
}

export function useMakeNow() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ cocktailId, quantity }: { cocktailId: string; quantity: number }) =>
            cocktailsApi.makeNow(cocktailId, quantity),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.pantry.items })
            qc.invalidateQueries({ queryKey: keys.stats.all })
            qc.invalidateQueries({ queryKey: keys.profile.me })
            void noteRatePromptEligibleAction()
        },
    })
}
