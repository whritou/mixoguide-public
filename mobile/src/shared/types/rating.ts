export interface RatingDTO {
    id: string
    userId: string
    cocktailId: string
    rating: number
    user?: { id: string; name: string } | null
    cocktail?: { id: string; name: string } | null
    createdAt: string
}
