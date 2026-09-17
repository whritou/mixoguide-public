import { createMapper } from './createMapper'
import type { CocktailDTO, Cocktail } from '@/types/models/cocktail'

export const [mapCocktail, mapCocktails] = createMapper<CocktailDTO, Cocktail>((dto, n) => ({
    id:              dto.id,
    name:            dto.name,
    source:          dto.source,
    difficulty:      dto.difficulty,
    createdAt:       dto.createdAt,
    updatedAt:       n(dto.updatedAt),

    description:     n(dto.description),
    fullDescription: n(dto.fullDescription),
    instructions:    dto.instructions?.length ? dto.instructions : undefined,
    imageUrl:        n(dto.imageUrl),
    isAlcoholic:     n(dto.isAlcoholic),
    mainAlcoholId:   n(dto.mainAlcoholId),
    preparationTime: n(dto.preparationTime),
    origin:          n(dto.origin),
    glassId:         n(dto.glassId),

    avgRating:   n(dto.avgRating),
    ratingCount: dto.ratingCount ?? undefined,

    technique: dto.technique?.length ? dto.technique : undefined,
    flavors:   dto.flavors?.length   ? dto.flavors   : undefined,
    occasions: dto.occasions?.length ? dto.occasions : undefined,

    glass:       n(dto.glass),
    mainAlcohol: n(dto.mainAlcohol),
    ingredients: dto.ingredients?.length ? dto.ingredients : undefined,
    barTools:    dto.barTools?.length    ? dto.barTools    : undefined,
    _count:      dto._count,
}))
