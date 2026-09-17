'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { plannedCollectionsApi, type PlannedCollectionCreatePayload } from '@/lib/api/planned-collections.api'
import { invalidators } from '@/lib/invalidation'
import type { PlannedCollection } from '@/types/models/planned-collection'

export function usePlannedCollectionMutations() {
    const qc = useQueryClient()

    const create = useMutation({
        mutationFn: (data: PlannedCollectionCreatePayload) => plannedCollectionsApi.create(data),
        onSettled:  () => invalidators.plannedCocktails(qc),
    })

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<PlannedCollection> }) =>
            plannedCollectionsApi.update(id, data),
        onSettled: () => invalidators.plannedCocktails(qc),
    })

    const remove = useMutation({
        mutationFn: (id: string) => plannedCollectionsApi.remove(id),
        onSettled:  () => invalidators.plannedCocktails(qc),
    })

    const complete = useMutation({
        mutationFn: (id: string) => plannedCollectionsApi.complete(id),
        onSettled: (_d, _e, id) => invalidators.plannedCollectionComplete(qc, id),
    })

    const addCocktail = useMutation({
        mutationFn: ({ id, cocktailId }: { id: string; cocktailId: string }) =>
            plannedCollectionsApi.addCocktail(id, cocktailId),
        onSettled: () => invalidators.plannedCocktails(qc),
    })

    const removeCocktail = useMutation({
        mutationFn: ({ id, cocktailId }: { id: string; cocktailId: string }) =>
            plannedCollectionsApi.removeCocktail(id, cocktailId),
        onSettled: () => invalidators.plannedCocktails(qc),
    })

    const completeCocktail = useMutation({
        mutationFn: ({ id, cocktailId }: { id: string; cocktailId: string }) =>
            plannedCollectionsApi.completeCocktail(id, cocktailId),
        onSettled: (_d, _e, { id }) => invalidators.plannedCollectionComplete(qc, id),
    })

    return { create, update, remove, complete, addCocktail, removeCocktail, completeCocktail }
}
