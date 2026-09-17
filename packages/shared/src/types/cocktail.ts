export type CocktailSource = 'custom' | 'cocktaildb' | 'ninjas'

export const COCKTAIL_DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export const COCKTAIL_TECHNIQUES = ['shaken', 'stirred', 'built', 'layered', 'blended', 'flamed', 'infused', 'clarified', 'muddled', 'smoked'] as const
export const UNITS = ['cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist'] as const
export const COCKTAIL_FLAVORS = [
    'sweet', 'sour', 'bitter', 'spicy', 'savory', 'fruity', 'herbal', 'smoky',
    'floral', 'refreshing', 'creamy', 'citrus', 'nutty', 'earthy', 'bubbly',
    'tropical', 'dry', 'rich', 'strong', 'warm', 'coffee', 'light',
] as const
export const COCKTAIL_OCCASIONS = [
    'party', 'romantic', 'casual', 'formal', 'holiday', 'summer', 'winter', 'spring',
    'fall', 'celebration', 'everyday', 'brunch', 'happy_hour', 'after_dinner', 'dinner',
    'before_dinner', 'cocktail_hour', 'picnic', 'barbecue', 'beach', 'pool_party',
    'game_night', 'movie_night', 'date_night', 'family_gathering', 'friends_gathering',
    'wedding', 'birthday', 'anniversary', 'graduation', 'baby_shower', 'bridal_shower',
    'housewarming', 'new_years_eve', 'valentines_day', 'halloween', 'thanksgiving',
    'digestif', 'aperitif', 'date', 'mocktail_friendly', 'after_work', 'luxury', 'retro',
] as const

export type Unit = typeof UNITS[number]
export type CocktailFlavor = typeof COCKTAIL_FLAVORS[number]
export type CocktailDifficulty = typeof COCKTAIL_DIFFICULTIES[number]
export type CocktailTechnique = typeof COCKTAIL_TECHNIQUES[number]
export type CocktailOccasion = typeof COCKTAIL_OCCASIONS[number]

export type MakeableStatus = 'full' | 'withSubstitutes' | 'withDerivates' | 'missing'

export interface CocktailIngredient {
    ingredientId: string
    amount?: number | null
    unit?: Unit | null
    optional?: boolean
    substitutes?: string[]
    ingredient: {
        id: string
        name: string
        imageUrl: string | null
        isAlcoholic: boolean | null
        abv: number | null
        type?: { name: string } | null
        subType?: { name: string } | null
    }
}

export interface CocktailBarTool {
    barTool: {
        id: string
        name: string
        isEssential?: boolean | null
    }
}

export interface CocktailDTO {
    id: string
    name: string
    description: string | null
    fullDescription: string | null
    instructions: string[]
    imageUrl: string | null
    isAlcoholic: boolean | null
    mainAlcoholId: string | null
    source: CocktailSource
    difficulty: CocktailDifficulty
    preparationTime: number | null
    technique: CocktailTechnique[]
    flavors: CocktailFlavor[]
    occasions: CocktailOccasion[]
    origin: string | null
    glassId: string | null
    avgRating: number | null
    ratingCount: number
    createdAt: string
    updatedAt: string
    glass?: { id: string; name: string; imageUrl: string | null } | null
    mainAlcohol?: { id: string; name: string; imageUrl: string | null } | null
    ingredients?: CocktailIngredient[]
    barTools?: CocktailBarTool[]
    _count?: { ratings: number; favoritedBy: number }
}

export interface MakeableCocktail extends CocktailDTO {
    makeableStatus: MakeableStatus
    missingCount: number
    requiredCount: number
    missingIngredients: { id: string; name: string }[]
    substituteIngredients: { id: string; name: string }[]
    derivedIngredients: { id: string; name: string; fromId: string; fromName: string }[]
}
