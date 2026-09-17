export interface ProfileData {
    id: string
    name: string | null
    email: string
    image: string | null
    role: string
    createdAt: string
    hasPassword: boolean
    stats: {
        favoriteCocktails: number
        ratings: number
        pantryItems: number
        plannedCocktails: number
    }
}
