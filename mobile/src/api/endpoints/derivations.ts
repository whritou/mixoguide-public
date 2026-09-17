import { api } from '../client'

export type DerivationEntry = {
    baseIngredientId: string
    yieldAmount: number
    yieldUnit: string
}

export type DerivationMap = Record<string, DerivationEntry[]>

export const derivationsApi = {
    get: () =>
        api.get<{ success: true; data: DerivationMap }>('/api/derivations')
            .then(res => res.data.data ?? {}),
}
