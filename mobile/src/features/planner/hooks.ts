import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plannedCocktailsApi, plannedCollectionsApi } from '@/api/endpoints/planner'
import { keys } from '@/lib/query-keys'
import { noteRatePromptEligibleAction } from '@/lib/ratePrompt'
import type { PlannedCocktailDTO, PlannedCollectionDTO } from '@mixoguide/shared'

// ── Planned cocktails ──────────────────────────────────────────────────────────

export function usePlannedCocktails(enabled = true) {
    return useQuery({
        queryKey: keys.plannedCocktails.list,
        queryFn:  () => plannedCocktailsApi.list().then(r => Array.isArray(r.data.data) ? r.data.data : []),
        staleTime: 1000 * 60 * 2,
        enabled,
    })
}

export function useCreatePlannedCocktail() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: { cocktailId: string; plannedFor: string; quantity: number }) =>
            plannedCocktailsApi.create(p),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.plannedCocktails.list }),
    })
}

export function useDeletePlannedCocktail() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => plannedCocktailsApi.delete(id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: keys.plannedCocktails.list })
            const prev = qc.getQueryData<PlannedCocktailDTO[]>(keys.plannedCocktails.list) ?? []
            qc.setQueryData<PlannedCocktailDTO[]>(keys.plannedCocktails.list, prev.filter(i => i.id !== id))
            return { prev }
        },
        onError: (_e, _v, ctx) => {
            if (ctx?.prev) qc.setQueryData(keys.plannedCocktails.list, ctx.prev)
        },
        onSettled: () => qc.invalidateQueries({ queryKey: keys.plannedCocktails.list }),
    })
}

export function useUpdatePlannedCocktail() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...payload }: {
            id: string
            plannedFor?: string
            quantity?: number
            status?: 'planned' | 'done'
        }) => plannedCocktailsApi.update(id, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.plannedCocktails.list }),
    })
}

export function useCompletePlannedCocktail() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => plannedCocktailsApi.complete(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.plannedCocktails.list })
            qc.invalidateQueries({ queryKey: keys.pantry.items })
            qc.invalidateQueries({ queryKey: keys.cocktails.makeable })
            qc.invalidateQueries({ queryKey: keys.stats.all })
            qc.invalidateQueries({ queryKey: keys.profile.me })
            void noteRatePromptEligibleAction()
        },
    })
}

// ── Planned collections ────────────────────────────────────────────────────────

export function usePlannedCollections(enabled = true) {
    return useQuery({
        queryKey: keys.plannedCollections.list,
        queryFn:  () => plannedCollectionsApi.list().then(r => Array.isArray(r.data.data) ? r.data.data : []),
        staleTime: 1000 * 60 * 2,
        enabled,
    })
}

export function usePlannedCollection(id: string) {
    return useQuery({
        queryKey: keys.plannedCollections.detail(id),
        queryFn:  () => plannedCollectionsApi.getById(id).then(r => r.data.data),
        enabled:  !!id,
    })
}

export function useGroceryList(collectionId: string) {
    return useQuery({
        queryKey: keys.plannedCollections.grocery(collectionId),
        queryFn:  () => plannedCollectionsApi.getGroceryList(collectionId).then(r => r.data.data),
        enabled:  !!collectionId,
    })
}

export function useCreatePlannedCollection() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: { title: string; plannedFor: string; servings: number; occasions: string[]; cocktailIds?: string[] }) =>
            plannedCollectionsApi.create(p),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.plannedCollections.list }),
    })
}

export function useDeletePlannedCollection() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => plannedCollectionsApi.delete(id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: keys.plannedCollections.list })
            const prev = qc.getQueryData<PlannedCollectionDTO[]>(keys.plannedCollections.list) ?? []
            qc.setQueryData<PlannedCollectionDTO[]>(keys.plannedCollections.list, prev.filter(i => i.id !== id))
            return { prev }
        },
        onError: (_e, _v, ctx) => {
            if (ctx?.prev) qc.setQueryData(keys.plannedCollections.list, ctx.prev)
        },
        onSettled: () => qc.invalidateQueries({ queryKey: keys.plannedCollections.list }),
    })
}

export function useCompletePlannedCollection() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => plannedCollectionsApi.complete(id),
        onSuccess: (_, id) => {
            qc.invalidateQueries({ queryKey: keys.plannedCollections.list })
            qc.invalidateQueries({ queryKey: keys.plannedCollections.detail(id) })
            qc.invalidateQueries({ queryKey: keys.pantry.items })
            qc.invalidateQueries({ queryKey: keys.cocktails.makeable })
            qc.invalidateQueries({ queryKey: keys.stats.all })
            qc.invalidateQueries({ queryKey: keys.profile.me })
            void noteRatePromptEligibleAction()
        },
    })
}

export function useAddCocktailToCollection() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ collectionId, cocktailId }: { collectionId: string; cocktailId: string }) =>
            plannedCollectionsApi.addCocktail(collectionId, cocktailId),
        onSuccess: (_d, { collectionId }) => {
            qc.invalidateQueries({ queryKey: keys.plannedCollections.detail(collectionId) })
            qc.invalidateQueries({ queryKey: keys.plannedCollections.grocery(collectionId) })
        },
    })
}

export function useRemoveCocktailFromCollection() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ collectionId, cocktailId }: { collectionId: string; cocktailId: string }) =>
            plannedCollectionsApi.removeCocktail(collectionId, cocktailId),
        onSuccess: (_d, { collectionId }) => {
            qc.invalidateQueries({ queryKey: keys.plannedCollections.detail(collectionId) })
            qc.invalidateQueries({ queryKey: keys.plannedCollections.grocery(collectionId) })
        },
    })
}

export function useCompleteCollectionCocktail() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ collectionId, cocktailId }: { collectionId: string; cocktailId: string }) =>
            plannedCollectionsApi.completeCocktail(collectionId, cocktailId),
        onSuccess: (_d, { collectionId }) => {
            qc.invalidateQueries({ queryKey: keys.plannedCollections.list })
            qc.invalidateQueries({ queryKey: keys.plannedCollections.detail(collectionId) })
            qc.invalidateQueries({ queryKey: keys.plannedCollections.grocery(collectionId) })
            qc.invalidateQueries({ queryKey: keys.pantry.items })
            qc.invalidateQueries({ queryKey: keys.cocktails.makeable })
            qc.invalidateQueries({ queryKey: keys.stats.all })
            qc.invalidateQueries({ queryKey: keys.profile.me })
            void noteRatePromptEligibleAction()
        },
    })
}
