import { createMapper } from './createMapper'
import type {
    IngredientSubTypeDTO,
    IngredientSubType,
} from '@/types/models/ingredient-sub-type'

export const [mapIngredientSubType, mapIngredientSubTypes] = createMapper<
    IngredientSubTypeDTO,
    IngredientSubType
>((dto) => ({
    id:     dto.id,
    name:   dto.name,
    typeId: dto.typeId,
    type:   dto.type,
}))
