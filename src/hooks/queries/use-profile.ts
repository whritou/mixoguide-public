'use client'

import { useQuery } from '@tanstack/react-query'
import { profileApi } from '@/lib/api/profile.api'
import { queryKeys } from '@/lib/query-keys'

export function useProfileQuery() {
    return useQuery({
        queryKey: queryKeys.profile.me(),
        queryFn:  profileApi.me,
    })
}
