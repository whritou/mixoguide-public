import { api } from './fetcher'
import type { ListParams } from '@/lib/query-keys'

export type SuggestionStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'
export type SuggestionType   = 'NEW_COCKTAIL' | 'NEW_INGREDIENT' | 'MODIFY_COCKTAIL' | 'MODIFY_INGREDIENT'

export interface Suggestion {
    id:          string
    type:        SuggestionType
    status:      SuggestionStatus
    title:       string
    content:     string
    targetId?:   string | null
    targetName?: string | null
    adminNote?:  string | null
    createdAt:   string
    updatedAt?:  string
    user:        { id: string; name?: string | null; email: string; image?: string | null }
}

export interface SuggestionListParams {
    status:  SuggestionStatus | 'ALL'
    search?: string
    page:    number
    limit:   number
}

/** Admin suggestions API (list/detail/update/delete). */
export const suggestionsApi = {
    list: async ({ status, search, page, limit }: SuggestionListParams) => {
        // Flat `status=` is how parseQueryParams reads filters (the previous
        // `filters=<json>` param was parsed as a filter on a field named "filters").
        const params: ListParams = { page, limit }
        if (status !== 'ALL') params.status = status
        if (search) params.search = search
        const res = await api.getList<Suggestion>('suggestions', params)
        return { items: res.data ?? [], total: res.meta?.total ?? 0 }
    },
    get: async (id: string) => {
        const res = await api.getOne<Suggestion>('suggestions', id)
        return res.data
    },
    update: async (id: string, data: { status: SuggestionStatus; adminNote: string | null }) => {
        const res = await api.put<Suggestion, typeof data>(`suggestions/${id}`, data)
        return res.data
    },
    remove: (id: string) => api.delete(`suggestions/${id}`),
}
