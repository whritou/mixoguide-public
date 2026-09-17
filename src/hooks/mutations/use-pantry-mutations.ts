'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    pantryApi,
    type UpsertPantryData,
    type UpdatePantryData,
    type RestockPantryItemInput,
    type PantryListCache,
} from '@/lib/api/pantry.api'
import { queryKeys } from '@/lib/query-keys'
import { invalidators } from '@/lib/invalidation'
import type { UserPantryItem } from '@/types/models/pantry'

export function usePantryMutations() {
    const qc = useQueryClient()

    const add = useMutation({
        mutationFn: (data: UpsertPantryData) => pantryApi.add(data),
        onSettled:  () => invalidators.pantry(qc),
    })

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePantryData }) =>
            pantryApi.update(id, data),
        onMutate: async ({ id, data }) => {
            await qc.cancelQueries({ queryKey: queryKeys.pantry.all })
            const snaps = qc.getQueriesData<PantryListCache>({ queryKey: queryKeys.pantry.all })
            qc.setQueriesData<PantryListCache>({ queryKey: queryKeys.pantry.all }, (old) =>
                old ? {
                    ...old,
                    items: old.items.map((i) =>
                        i.id === id
                            ? {
                                  ...i,
                                  ...data,
                                  expirationDate: data.expirationDate ?? i.expirationDate,
                                  note:           data.note ?? i.note,
                              } as UserPantryItem
                            : i
                    ),
                } : old,
            )
            return { snaps }
        },
        onError:   (_e, _v, ctx) => ctx?.snaps.forEach(([k, d]) => qc.setQueryData(k, d)),
        onSettled: () => invalidators.pantry(qc),
    })

    const moveToPantry = useMutation({
        mutationFn: ({ ingredientId, amount, unitLeft }: { ingredientId: string; amount: number; unitLeft?: string }) =>
            pantryApi.moveToPantry(ingredientId, amount, unitLeft),
        onSettled: () => invalidators.pantry(qc),
    })

    const restock = useMutation({
        mutationFn: (items: RestockPantryItemInput[]) => pantryApi.restock(items),
        onSettled: () => invalidators.pantry(qc),
    })

    const remove = useMutation({
        mutationFn: (id: string) => pantryApi.remove(id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: queryKeys.pantry.all })
            const snaps = qc.getQueriesData<PantryListCache>({ queryKey: queryKeys.pantry.all })
            qc.setQueriesData<PantryListCache>(
                { queryKey: queryKeys.pantry.all },
                (old) => old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old,
            )
            return { snaps }
        },
        onError:   (_e, _v, ctx) => ctx?.snaps.forEach(([k, d]) => qc.setQueryData(k, d)),
        onSettled: () => invalidators.pantry(qc),
    })

    return { add, update, moveToPantry, restock, remove }
}
