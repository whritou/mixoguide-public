export interface UserPantryItemDTO {
    id: string
    userId: string
    ingredientId: string
    quantity: number
    unitLeft: string
    favorite: boolean
    expirationDate: string | null
    isEssential: boolean
    isInfinite: boolean
    isInPantry: boolean
    isInShoppingList: boolean
    shoppingQuantity: number
    addedAt: string
    note: string | null
    updatedAt: string | null
    ingredient: {
        id: string
        name: string
        imageUrl: string | null
        isAlcoholic: boolean | null
        type?: { id: string; name: string } | null
        subType?: { id: string; name: string } | null
    } | null
}
