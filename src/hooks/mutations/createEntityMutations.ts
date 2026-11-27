'use client'

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'

interface ListCache<T> {
    items: T[]
    meta: { total?: number; page?: number; limit?: number }
}

interface EntityApi<T> {
    create: (data: Partial<T>) => Promise<T>
    update: (id: string, data: Partial<T>) => Promise<T>
    remove: (id: string) => Promise<unknown>
}

interface EntityMutationConfig<T extends { id: string }> {
    api: EntityApi<T>
    listKeys: () => readonly unknown[]
    detailKey?: (id: string) => readonly unknown[]
    /**
     * Invalidator called after create and remove. Also used for update when invalidateOnUpdate is omitted.
     * Its promise is returned from onSettled so the mutation stays pending until caches have refetched.
     */
    invalidate: (qc: QueryClient) => Promise<unknown> | void
    /** Invalidator called after update when the entity has a detail view with a separate cache key. */
    invalidateOnUpdate?: (qc: QueryClient, id: string) => Promise<unknown> | void
}

export function createEntityMutations<T extends { id: string }>(
    config: EntityMutationConfig<T>,
) {
    return function useEntityMutations() {
        const qc = useQueryClient()

        const create = useMutation({
            mutationFn: (data: Partial<T>) => config.api.create(data),
            onMutate: async (data) => {
                await qc.cancelQueries({ queryKey: config.listKeys() })
                const snapshots = qc.getQueriesData<ListCache<T>>({ queryKey: config.listKeys() })
                const tmpId = `tmp-${Date.now()}`
                qc.setQueriesData<ListCache<T>>(
                    { queryKey: config.listKeys() },
                    (old) => old ? { ...old, items: [{ id: tmpId, ...data } as T, ...old.items] } : old,
                )
                return { snapshots }
            },
            onError: (_e, _v, ctx) => {
                ctx?.snapshots.forEach(([key, d]) => qc.setQueryData(key, d))
            },
            onSettled: () => config.invalidate(qc),
        })

        const update = useMutation({
            mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
                config.api.update(id, data),
            onMutate: async ({ id, data }) => {
                await qc.cancelQueries({ queryKey: config.listKeys() })
                const snapshots = qc.getQueriesData<ListCache<T>>({ queryKey: config.listKeys() })
                qc.setQueriesData<ListCache<T>>(
                    { queryKey: config.listKeys() },
                    (old) =>
                        old
                            ? { ...old, items: old.items.map((item) => (item.id === id ? { ...item, ...data } : item)) }
                            : old,
                )
                let detailSnap: T | undefined
                if (config.detailKey) {
                    detailSnap = qc.getQueryData<T>(config.detailKey(id))
                    if (detailSnap) qc.setQueryData(config.detailKey(id), { ...detailSnap, ...data })
                }
                return { snapshots, detailSnap }
            },
            onError: (_e, vars, ctx) => {
                ctx?.snapshots.forEach(([key, d]) => qc.setQueryData(key, d))
                if (ctx?.detailSnap && config.detailKey) {
                    qc.setQueryData(config.detailKey(vars.id), ctx.detailSnap)
                }
            },
            onSettled: (_d, _e, vars) =>
                config.invalidateOnUpdate
                    ? config.invalidateOnUpdate(qc, vars.id)
                    : config.invalidate(qc),
        })

        const remove = useMutation({
            mutationFn: (id: string) => config.api.remove(id),
            onMutate: async (id) => {
                await qc.cancelQueries({ queryKey: config.listKeys() })
                const snapshots = qc.getQueriesData<ListCache<T>>({ queryKey: config.listKeys() })
                qc.setQueriesData<ListCache<T>>(
                    { queryKey: config.listKeys() },
                    (old) => old ? { ...old, items: old.items.filter((item) => item.id !== id) } : old,
                )
                return { snapshots }
            },
            onError: (_e, _v, ctx) => {
                ctx?.snapshots.forEach(([key, d]) => qc.setQueryData(key, d))
            },
            onSettled: () => config.invalidate(qc),
        })

        return { create, update, remove }
    }
}
