export interface PlannedCollectionCocktailEntry {
    id: string
    cocktailId: string
    status: 'planned' | 'done'
    completedAt: string | null
    cocktail?: {
        id: string
        name: string
        imageUrl?: string
        difficulty?: string
        ingredients?: {
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
        }[]
    }
}

export interface PlannedCollectionDTO {
    id: string
    userId: string
    title: string
    plannedFor: string
    servings: number
    occasions: string[]
    status: 'planned' | 'done'
    completedAt: string | null
    createdAt: string
    updatedAt: string | null
    cocktails: PlannedCollectionCocktailEntry[]
}
