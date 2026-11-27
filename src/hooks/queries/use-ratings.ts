'use client'

import { useQuery } from '@tanstack/react-query'
import { ratingsApi } from '@/lib/api/ratings.api'
import { queryKeys, type ListParams } from '@/lib/query-keys'

export function useRatingsQuery(params: ListParams = {}, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: queryKeys.ratings.list(params),
        queryFn:  () => ratingsApi.list(params),
        enabled:  options.enabled ?? true,
    })
}

export function useRatingQuery(id: string) {
    return useQuery({
        queryKey: queryKeys.ratings.detail(id),
        queryFn:  () => ratingsApi.list({ id }),
        enabled:  Boolean(id),
    })
}
