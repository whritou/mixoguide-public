import { createMapper } from './createMapper'
import type { IngredientDTO, Ingredient } from '@/types/models/ingredient'

export const [mapIngredient, mapIngredients] = createMapper<IngredientDTO, Ingredient>((dto, n) => ({
    id:            dto.id,
    name:          dto.name,
    description:   n(dto.description),
    typeId:        dto.typeId,
    subTypeId:     n(dto.subTypeId),
    type:          dto.type,
    subType:       n(dto.subType),
    isAlcoholic:   n(dto.isAlcoholic),
    abv:           n(dto.abv),
    brand:         n(dto.brand),
    imageUrl:      n(dto.imageUrl),
    unit:          dto.unit,
    _count:        n(dto._count),
}))
