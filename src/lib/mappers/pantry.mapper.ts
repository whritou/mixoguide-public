import type { UserPantryItemDTO, UserPantryItem } from '@/types/models/pantry'

export function mapPantryItem(dto: UserPantryItemDTO): UserPantryItem {
    return {
        id:               dto.id,
        userId:           dto.userId,
        ingredientId:     dto.ingredientId,
        quantity:         dto.quantity,
        unitLeft:         dto.unitLeft,
        favorite:         dto.favorite,
        expirationDate:   dto.expirationDate ?? undefined,
        isEssential:      dto.isEssential,
        isInfinite:       dto.isInfinite,
        isInPantry:       dto.isInPantry,
        isInShoppingList: dto.isInShoppingList,
        shoppingQuantity: dto.shoppingQuantity ?? 0,
        addedAt:          dto.addedAt,
        note:             dto.note ?? undefined,
        updatedAt:        dto.updatedAt ?? undefined,
        ingredient:       dto.ingredient ? {
            id:            dto.ingredient.id,
            name:          dto.ingredient.name,
            imageUrl:      dto.ingredient.imageUrl ?? undefined,
            isAlcoholic:   dto.ingredient.isAlcoholic ?? undefined,
            type:          dto.ingredient.type ?? undefined,
            subType:       dto.ingredient.subType ?? undefined,
        } : undefined,
    }
}

export function mapPantryItems(dtos: UserPantryItemDTO[]): UserPantryItem[] {
    return dtos.map(mapPantryItem)
}
