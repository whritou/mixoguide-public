import { createMapper } from './createMapper'
import type {
    IngredientTypeDTO,
    IngredientType,
} from '@/types/models/ingredient-type'

export const [mapIngredientType, mapIngredientTypes] = createMapper<
    IngredientTypeDTO,
    IngredientType
>((dto) => ({
    id:   dto.id,
    name: dto.name,
}))
