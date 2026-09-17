'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cocktailsApi } from '@/lib/api/cocktails.api'
import { queryKeys } from '@/lib/query-keys'
import { invalidators } from '@/lib/invalidation'
import type { Cocktail } from '@/types/models/cocktail'
import type { SyncIngredient } from '@/lib/api/types'

interface ListCache {
    items: Cocktail[]
    meta:  { total?: number; page?: number; limit?: number }
}

export function useCocktailMutations() {
    const qc = useQueryClient()

    const create = useMutation({
        mutationFn: (data: Partial<Cocktail>) => cocktailsApi.create(data),
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: queryKeys.cocktails.lists() })
            const snapshots = qc.getQueriesData<ListCache>({ queryKey: queryKeys.cocktails.lists() })
            const tmpId = `tmp-${Date.now()}`
            qc.setQueriesData<ListCache>(
                { queryKey: queryKeys.cocktails.lists() },
                (old) => old ? { ...old, items: [{ id: tmpId, ...data } as Cocktail, ...old.items] } : old,
            )
            return { snapshots }
        },
        onError: (_e, _v, ctx) => {
            ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
        },
        onSettled: () => invalidators.cocktails(qc),
    })

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Cocktail> }) =>
            cocktailsApi.update(id, data),
        onMutate: async ({ id, data }) => {
            await qc.cancelQueries({ queryKey: queryKeys.cocktails.all })
            const listSnap   = qc.getQueriesData<ListCache>({ queryKey: queryKeys.cocktails.lists() })
            const detailSnap = qc.getQueryData<Cocktail>(queryKeys.cocktails.detail(id))

            qc.setQueriesData<ListCache>({ queryKey: queryKeys.cocktails.lists() }, (old) =>
                old ? { ...old, items: old.items.map(c => c.id === id ? { ...c, ...data } : c) } : old,
            )
            if (detailSnap) qc.setQueryData(queryKeys.cocktails.detail(id), { ...detailSnap, ...data })

            return { listSnap, detailSnap }
        },
        onError: (_e, vars, ctx) => {
            ctx?.listSnap.forEach(([key, data]) => qc.setQueryData(key, data))
            if (ctx?.detailSnap) qc.setQueryData(queryKeys.cocktails.detail(vars.id), ctx.detailSnap)
        },
        onSettled: (_d, _e, vars) => invalidators.cocktailDetail(qc, vars.id),
    })

    const remove = useMutation({
        mutationFn: (id: string) => cocktailsApi.remove(id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: queryKeys.cocktails.lists() })
            const snapshots = qc.getQueriesData<ListCache>({ queryKey: queryKeys.cocktails.lists() })
            qc.setQueriesData<ListCache>(
                { queryKey: queryKeys.cocktails.lists() },
                (old) => old ? { ...old, items: old.items.filter(c => c.id !== id) } : old,
            )
            return { snapshots }
        },
        onError: (_e, _v, ctx) => {
            ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
        },
        onSettled: () => invalidators.cocktails(qc),
    })

    const syncIngredients = useMutation({
        mutationFn: ({ id, ingredients }: { id: string; ingredients: SyncIngredient[] }) =>
            cocktailsApi.syncIngredients(id, ingredients),
        onSettled: (_d, _e, vars) => invalidators.cocktailDetail(qc, vars.id),
    })

    const syncBarTools = useMutation({
        mutationFn: ({ id, ids }: { id: string; ids: string[] }) =>
            cocktailsApi.syncBarTools(id, ids),
        onSettled: (_d, _e, vars) => invalidators.cocktailDetail(qc, vars.id),
    })

    const make = useMutation({
        mutationFn: ({ id }: { id: string }) => cocktailsApi.make(id),
        onSettled: (_d, _e, vars) => invalidators.cocktailMade(qc, vars.id),
    })

    return { create, update, remove, syncIngredients, syncBarTools, make }
}
