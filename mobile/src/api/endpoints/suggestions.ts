import { api } from '../client'

export type SuggestionType =
    | 'NEW_COCKTAIL'
    | 'NEW_INGREDIENT'
    | 'MODIFY_COCKTAIL'
    | 'MODIFY_INGREDIENT'

export interface CreateSuggestionPayload {
    type:        SuggestionType
    title:       string
    content:     string
    targetId?:   string | null
    targetName?: string | null
}

export const suggestionsApi = {
    create: (payload: CreateSuggestionPayload) =>
        api.post<{ success: true; data: { id: string } }>('/api/suggestions', payload),
}
