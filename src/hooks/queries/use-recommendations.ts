'use client'

import { useQuery } from '@tanstack/react-query'
import { recommendationsApi } from '@/lib/api/recommendations.api'
import { queryKeys } from '@/lib/query-keys'

export function useRecommendationsQuery() {
    return useQuery({
        queryKey: queryKeys.recommendations.all,
        queryFn:  () => recommendationsApi.get(),
    })
}
