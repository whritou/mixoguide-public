
export interface CocktailDBDrink {
    idDrink: string
    strDrink: string
    strInstructions: string | null
    strDrinkThumb: string | null
    strGlass: string | null
    strAlcoholic: string | null
    [key: string]: string | null | undefined
    // strIngredient1..15 and strMeasure1..15 accessed dynamically
}

export interface CocktailDBIngredient {
    idIngredient: string
    strIngredient: string
    strDescription: string | null
    strType: string | null
    strAlcohol: string | null
    strABV: string | null
}

export type MeasureUnit = 'cl' | 'ml' | 'oz' | 'g' | 'pcs' | 'zest' | 'slice' | 'twist'
export type Flavor =
    | 'sweet' | 'sour' | 'bitter' | 'spicy' | 'savory' | 'fruity' | 'herbal' | 'smoky' | 'floral' | 'refreshing'
    | 'creamy' | 'citrus' | 'nutty' | 'earthy' | 'bubbly' | 'tropical'
    | 'dry' | 'rich' | 'strong' | 'warm' | 'coffee' | 'light'
export type Occasion =
    | 'party' | 'romantic' | 'casual' | 'formal' | 'holiday' | 'summer' | 'winter' | 'spring' | 'fall' | 'celebration'
    | 'everyday' | 'brunch' | 'happy_hour' | 'after_dinner' | 'dinner' | 'before_dinner' | 'cocktail_hour' | 'picnic' | 'barbecue'
    | 'beach' | 'pool_party' | 'game_night' | 'movie_night' | 'date_night' | 'family_gathering' | 'friends_gathering' | 'wedding' | 'birthday' | 'anniversary'
    | 'graduation' | 'baby_shower' | 'bridal_shower' | 'housewarming' | 'new_years_eve' | 'valentines_day' | 'halloween' | 'thanksgiving' | 'digestif' | 'aperitif' | 'date' | 'mocktail_friendly' | 'after_work' | 'luxury' | 'retro'
export type Technique = 'shaken' | 'stirred' | 'built' | 'layered' | 'blended' | 'flamed' | 'infused' | 'clarified' | 'muddled' | 'smoked'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface ParsedMeasure {
    amount: number | null
    unit: MeasureUnit
}

export interface ResolvedIngredient {
    id: string
    name: string
    isAlcoholic: boolean
    typeId: string
    typeName: string
}
