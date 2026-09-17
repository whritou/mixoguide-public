import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pantryApi, type PantryUpsertPayload, type RestockPantryPayload } from '@/api/endpoints/pantry'
import { ingredientsApi } from '@/api/endpoints/ingredients'
import { keys } from '@/lib/query-keys'
import type { UserPantryItemDTO } from '@mixoguide/shared'

export function usePantryItems(enabled = true) {
    return useQuery({
        queryKey: keys.pantry.items,
        queryFn:  () => pantryApi.list().then(r => r.data.data),
        staleTime: 1000 * 60 * 2,
        enabled,
    })
}

export function useAddPantryItem() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: PantryUpsertPayload) => pantryApi.upsert(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.pantry.items })
            qc.invalidateQueries({ queryKey: keys.cocktails.makeable })
        },
    })
}

export function useUpdatePantryItem() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<PantryUpsertPayload> }) =>
            pantryApi.update(id, payload),
        onMutate: async ({ id, payload }) => {
            await qc.cancelQueries({ queryKey: keys.pantry.items })
            const prev = qc.getQueryData<UserPantryItemDTO[]>(keys.pantry.items) ?? []
            qc.setQueryData<UserPantryItemDTO[]>(
                keys.pantry.items,
                prev.map(item => item.id === id ? { ...item, ...payload } : item)
            )
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(keys.pantry.items, ctx.prev)
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: keys.pantry.items })
            qc.invalidateQueries({ queryKey: keys.cocktails.makeable })
        },
    })
}

export function useDeletePantryItem() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => pantryApi.delete(id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: keys.pantry.items })
            const prev = qc.getQueryData<UserPantryItemDTO[]>(keys.pantry.items) ?? []
            qc.setQueryData<UserPantryItemDTO[]>(
                keys.pantry.items,
                prev.filter(item => item.id !== id)
            )
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(keys.pantry.items, ctx.prev)
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: keys.pantry.items })
            qc.invalidateQueries({ queryKey: keys.cocktails.makeable })
        },
    })
}

export function useMoveToPantry() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ ingredientId, amount, unitLeft }: { ingredientId: string; amount: number; unitLeft?: string }) =>
            pantryApi.moveToPantry(ingredientId, amount, unitLeft),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.pantry.items })
            qc.invalidateQueries({ queryKey: keys.cocktails.makeable })
        },
    })
}

export function useRestockPantryItems() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (items: RestockPantryPayload[]) => pantryApi.restock(items),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: keys.pantry.items })
            qc.invalidateQueries({ queryKey: keys.cocktails.makeable })
        },
    })
}

export function useIngredientSearch(query: string, enabled = true) {
    return useQuery({
        queryKey: keys.ingredients.search(query),
        queryFn:  () => ingredientsApi.search(query).then(r => r.data.data),
        enabled,
        staleTime: 1000 * 60 * 5,
    })
}
