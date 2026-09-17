export interface CocktailMadeLog {
    id: string
    userId: string
    cocktailId: string
    quantity: number
    madeAt: string
    note: string | null
    archived: boolean
    archivedCocktail?: {
        id: string
        name: string
        imageUrl: string | null
        difficulty: string | null
    } | null
    isArchivedCocktail?: boolean
    cocktail?: {
        id: string
        name: string
        imageUrl: string | null
        difficulty: string
    }
}
