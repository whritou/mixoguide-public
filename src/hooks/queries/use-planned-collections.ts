'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { plannedCollectionsApi } from '@/lib/api/planned-collections.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'
import type { MyRsvp } from '@/types/models/planned-collection'

export function usePlannedCollectionsQuery(params: ListParams = {}, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.plannedCollections.list(params),
        queryFn:  () => plannedCollectionsApi.list(params),
        enabled:  options?.enabled ?? true,
    })
}

export function useMyRsvpsQuery() {
    const { data: session, status } = useSession()
    const userId = session?.user?.id ?? null

    return useQuery({
        queryKey: [...queryKeys.rsvps.mine, userId ?? 'anonymous'],
        enabled: status === 'authenticated',
        staleTime: 0,
        queryFn:  async () => {
            const res = await fetch('/api/rsvps/mine', { cache: 'no-store' })
            if (!res.ok) throw new Error('Failed to load RSVPs')
            const json = await res.json()
            return (json?.data ?? []) as MyRsvp[]
        },
    })
}

export function usePlannedCollectionQuery(id: string) {
    return useQuery({
        queryKey: queryKeys.plannedCollections.detail(id),
        queryFn:  () => plannedCollectionsApi.get(id),
        enabled:  Boolean(id),
    })
}

export function useGroceryList(collectionId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.plannedCollections.grocery(collectionId),
        queryFn:  () => plannedCollectionsApi.grocery(collectionId),
        enabled:  Boolean(collectionId) && (options?.enabled ?? true),
    })
}
