import type { IngredientType } from './ingredient-type'

export interface IngredientSubType {
    id: string
    name: string
    typeId: string
    type?: IngredientType
}

export interface IngredientSubTypeDTO {
    id: string
    name: string
    typeId: string
    type?: { id: string; name: string }
}