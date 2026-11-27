'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { suggestionsApi, type Suggestion, type SuggestionStatus } from '@/lib/api/suggestions.api'
import { invalidators } from '@/lib/invalidation'
import { queryKeys } from '@/lib/query-keys'

export function useSuggestionMutations() {
    const qc = useQueryClient()

    const update = useMutation({
        mutationFn: ({ id, status, adminNote }: { id: string; status: SuggestionStatus; adminNote: string | null }) =>
            suggestionsApi.update(id, { status, adminNote }),
        onSuccess: (updated: Suggestion) => {
            qc.setQueryData(queryKeys.suggestions.detail(updated.id), updated)
            return qc.invalidateQueries({ queryKey: queryKeys.suggestions.lists() })
        },
    })

    const remove = useMutation({
        mutationFn: (id: string) => suggestionsApi.remove(id),
        onSuccess: () => invalidators.suggestions(qc),
    })

    return { update, remove }
}
