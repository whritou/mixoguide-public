export interface SyncIngredient {
    ingredientId: string
    amount?:      number
    unit?:        string
    optional?:    boolean
    substitutes?: string[]
}
