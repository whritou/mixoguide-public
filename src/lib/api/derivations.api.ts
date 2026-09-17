export type DerivationEntry = { baseIngredientId: string; yieldAmount: number; yieldUnit: string }
export type DerivationMap  = Record<string, DerivationEntry[]>

export const derivationsApi = {
    get: async (): Promise<DerivationMap> => {
        const res = await fetch('/api/derivations')
        if (!res.ok) return {}
        const json = await res.json()
        return json.data ?? {}
    },
}
