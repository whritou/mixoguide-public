'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { suggestionsApi, type SuggestionListParams } from '@/lib/api/suggestions.api'
import { queryKeys } from '@/lib/query-keys'

export function useSuggestionsQuery(params: SuggestionListParams) {
    return useQuery({
        queryKey: queryKeys.suggestions.list({ ...params }),
        queryFn:  () => suggestionsApi.list(params),
        placeholderData: keepPreviousData,
    })
}

export function useSuggestionQuery(id: string) {
    return useQuery({
        queryKey: queryKeys.suggestions.detail(id),
        queryFn:  () => suggestionsApi.get(id),
        enabled:  Boolean(id),
    })
}
