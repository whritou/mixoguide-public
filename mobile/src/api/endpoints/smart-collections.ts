import { api } from '../client'

export interface SmartCollectionCocktail {
    id:          string
    name:        string
    imageUrl:    string | null
    isAlcoholic: boolean | null
    difficulty:  string
    avgRating:   number | null
    ratingCount: number
}

export type SmartCollectionIcon   = 'sparkles' | 'heart' | 'sun' | 'snowflake' | 'coffee' | 'leaf' | 'moon' | 'flame'
export type SmartCollectionAccent = 'caramel' | 'brown' | 'amber' | 'ink' | 'rose' | 'sage'

export interface SmartCollection {
    slug:             string
    title:            string
    subtitle:         string
    icon:             SmartCollectionIcon
    accent:           SmartCollectionAccent
    defaultServings:  number
    defaultDayOffset: number
    occasions:        string[]
    cocktailCount:    number
    cocktails:        SmartCollectionCocktail[]
}

export const smartCollectionsApi = {
    list: () =>
        api.get<{ success: true; data: SmartCollection[] }>('/api/smart-collections'),

    get: (slug: string) =>
        api.get<{ success: true; data: SmartCollection }>(`/api/smart-collections/${slug}`),
}
