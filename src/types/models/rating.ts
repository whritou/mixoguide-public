export interface Cocktail {
    id: string
    name: string
}

export interface User {
    id: string
    name: string
}

export interface Rating {
    id: string
    userId: string
    cocktailId: string
    user?: User
    cocktail?: Cocktail
    rating: number
    createdAt: string
}

export interface RatingDTO {
    id: string
    userId: string
    cocktailId: string
    rating: number
    user?: User | null
    cocktail?: Cocktail | null
    createdAt: string
}