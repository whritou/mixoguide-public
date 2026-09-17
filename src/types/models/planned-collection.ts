export interface PlannedCollectionCocktailEntry {
    id:         string
    cocktailId: string
    status:     'planned' | 'done'
    completedAt: string | null
    cocktail?: {
        id:         string
        name:       string
        imageUrl?:  string
        difficulty?: string
        ingredients?: {
            ingredientId: string
            amount:       number | null
            unit:         string
            optional:     boolean
            ingredient:   {
                id: string
                name: string
                isAlcoholic?: boolean | null
                type?: { name: string } | null
                subType?: { name: string } | null
            }
        }[]
    }
}

export interface PlannedCollection {
    id:           string
    userId:       string
    title:        string
    location?:    string | null
    guestNote?:   string | null
    plannedFor:   string
    servings:     number
    occasions:    string[]
    status:       'planned' | 'done'
    completedAt?: string
    createdAt:    string
    updatedAt?:   string
    shareToken?:     string | null
    shareEnabled:    boolean
    rsvpGoingCount?: number
    cocktails:       PlannedCollectionCocktailEntry[]
}

export interface PlannedCollectionDTO {
    id:              string
    userId:          string
    title:           string
    location:        string | null
    guestNote:       string | null
    plannedFor:      string
    servings:        number
    occasions:       string[]
    status:          'planned' | 'done'
    completedAt:     string | null
    createdAt:       string
    updatedAt:       string | null
    shareToken:      string | null
    shareEnabled:    boolean
    rsvpGoingCount?: number
    cocktails:       PlannedCollectionCocktailEntry[]
}

export interface MyRsvp {
    id:         string
    userId:     string | null
    name:       string
    status:     'going' | 'maybe' | 'not_going'
    guestCount: number
    note:       string | null
    email:      string | null
    createdAt:  string
    collection: {
        id:           string
        userId:       string
        title:        string
        location:     string | null
        guestNote:    string | null
        plannedFor:   string
        shareToken:   string | null
        shareEnabled: boolean
        user:         { id: string; name: string | null } | null
    }
}
