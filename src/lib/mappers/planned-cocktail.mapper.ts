import type { PlannedCocktailDTO, PlannedCocktail} from '@/types/models/planned-cocktail'

export function mapPlannedCocktail(dto: PlannedCocktailDTO): PlannedCocktail {
    return {
        id:          dto.id,
        userId:      dto.userId,
        cocktailId:  dto.cocktailId,
        status:      dto.status,
        quantity:    dto.quantity ?? 1,
        plannedFor:  dto.plannedFor,
        completedAt: dto.completedAt ?? undefined,
        createdAt:   dto.createdAt,
        updatedAt:   dto.updatedAt ?? undefined,
        cocktail:    dto.cocktail ? {
            id:         dto.cocktail.id,
            name:       dto.cocktail.name,
            imageUrl:   dto.cocktail.imageUrl ?? undefined,
            difficulty: dto.cocktail.difficulty ?? undefined,
            ingredients: dto.cocktail.ingredients?.map(ing => ({
                ingredientId: ing.ingredientId,
                amount:       ing.amount,
                unit:         ing.unit,
                optional:     ing.optional,
                ingredient:   ing.ingredient,
            })),
        } : undefined,
    }
}

export function mapPlannedCocktails(dtos: PlannedCocktailDTO[]): PlannedCocktail[] {
    return dtos.map(mapPlannedCocktail)
}
