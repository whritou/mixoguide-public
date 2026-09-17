'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { plannedCocktailsApi } from '@/lib/api/planned-cocktails.api'
import { queryKeys } from '@/lib/query-keys'
import { invalidators } from '@/lib/invalidation'
import type { PlannedCocktail } from '@/types/models/planned-cocktail'

interface ListCache {
    items: PlannedCocktail[]
    meta:  { total?: number; page?: number; limit?: number }
}

export function usePlannedCocktailMutations() {
    const qc = useQueryClient()

    const create = useMutation({
        mutationFn: (data: Partial<PlannedCocktail>) => plannedCocktailsApi.create(data),
        onMutate: async (data) => {
            await qc.cancelQueries({ queryKey: queryKeys.plannedCocktails.lists() })
            const snapshots = qc.getQueriesData<ListCache>({ queryKey: queryKeys.plannedCocktails.lists() })
            const tmpId = `tmp-${Date.now()}`
            qc.setQueriesData<ListCache>(
                { queryKey: queryKeys.plannedCocktails.lists() },
                (old) => old ? { ...old, items: [{ id: tmpId, ...data } as PlannedCocktail, ...old.items] } : old,
            )
            return { snapshots }
        },
        onError: (_e, _v, ctx) => {
            ctx?.snapshots.forEach(([key, d]) => qc.setQueryData(key, d))
        },
        onSettled: () => invalidators.plannedCocktails(qc),
    })

    const remove = useMutation({
        mutationFn: (id: string) => plannedCocktailsApi.remove(id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: queryKeys.plannedCocktails.lists() })
            const snapshots = qc.getQueriesData<ListCache>({ queryKey: queryKeys.plannedCocktails.lists() })
            qc.setQueriesData<ListCache>(
                { queryKey: queryKeys.plannedCocktails.lists() },
                (old) => old ? { ...old, items: old.items.filter((p) => p.id !== id) } : old,
            )
            return { snapshots }
        },
        onError: (_e, _v, ctx) => {
            ctx?.snapshots.forEach(([key, d]) => qc.setQueryData(key, d))
        },
        onSettled: () => invalidators.plannedCocktails(qc),
    })

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<PlannedCocktail> }) =>
            plannedCocktailsApi.update(id, data),
        onSettled: () => invalidators.plannedCocktails(qc),
    })

    const complete = useMutation({
        mutationFn: ({ id }: { id: string; cocktailId: string }) =>
            plannedCocktailsApi.complete(id),
        onSettled: (_d, _e, vars) => invalidators.cocktailMade(qc, vars.cocktailId),
    })

    return { create, update, remove, complete }
}
