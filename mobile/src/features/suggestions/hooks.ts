import { useMutation } from '@tanstack/react-query'
import { suggestionsApi, type CreateSuggestionPayload } from '@/api/endpoints/suggestions'

export function useCreateSuggestion() {
    return useMutation({
        mutationFn: (payload: CreateSuggestionPayload) => suggestionsApi.create(payload),
    })
}
