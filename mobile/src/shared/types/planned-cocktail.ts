export interface PlannedCocktailIngredient {
    ingredientId: string
    amount: number | null
    unit: string
    optional: boolean
    ingredient: {
        id: string
        name: string
        type?: { name: string } | null
        subType?: { name: string } | null
    }
}

export interface PlannedCocktailDTO {
    id: string
    userId: string
    cocktailId: string
    status: 'planned' | 'done'
    quantity: number
    plannedFor: string
    completedAt: string | null
    createdAt: string
    updatedAt: string | null
    cocktail: {
        id: string
        name: string
        imageUrl: string | null
        difficulty: string | null
        ingredients?: PlannedCocktailIngredient[]
    } | null
}
