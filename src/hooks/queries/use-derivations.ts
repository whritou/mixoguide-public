'use client'

import { useQuery } from '@tanstack/react-query'
import { derivationsApi } from '@/lib/api/derivations.api'
import { queryKeys } from '@/lib/query-keys'

export function useDerivationsQuery() {
    return useQuery({
        queryKey: queryKeys.derivations.all,
        queryFn:  () => derivationsApi.get(),
        staleTime: Infinity, // derivations are static data — never re-fetch automatically
    })
}
