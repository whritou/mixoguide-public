export type MeasureUnit = 'cl' | 'ml' | 'oz' | 'g' | 'pcs' | 'zest' | 'slice' | 'twist'

export interface IngredientType {
    id: string
    name: string
}

export interface IngredientSubType {
    id: string
    name: string
    typeId: string
}

export interface Ingredient {
    id: string
    name: string
    description?: string

    typeId: string
    subTypeId?: string

    type: IngredientType
    subType?: IngredientSubType

    isAlcoholic?: boolean
    abv?: number
    brand?: string
    imageUrl?: string
    unit?: MeasureUnit

    /** How many cocktails reference this ingredient. Populated on list and detail responses. */
    _count?: { cocktailIngredients: number }
}

export interface IngredientDTO {
    id: string
    name: string
    description: string | null

    typeId: string
    subTypeId: string | null

    type: IngredientType
    subType?: IngredientSubType | null

    isAlcoholic: boolean | null
    abv: number | null
    brand: string | null
    imageUrl: string | null
    unit: MeasureUnit

    _count?: { cocktailIngredients: number }
}