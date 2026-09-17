import { convertUnit } from '@/lib/derivations/derivation-cache'
import { resolveIngredientUnitFallback } from '@/utils/ingredientUnitFallback'

export interface GroceryItem {
    ingredientId:   string
    ingredientName: string
    totalNeeded:    number
    unit:           string
    inPantry:       number
    missing:        number
    inWishlist:     boolean
}

interface PantryItemLike {
    ingredientId:     string
    quantity:         number
    unitLeft:         string | null
    isInPantry:       boolean
    isInShoppingList: boolean
    ingredient?: {
        name?: string | null
        isAlcoholic?: boolean | null
        type?: { name?: string | null } | null
        subType?: { name?: string | null } | null
    } | null
}

export interface PantryEntry {
    quantity:         number
    unit:             string
    isInShoppingList: boolean
}

export interface NeededIngredient {
    ingredientId: string
    ingredientName: string
    amount: number
    unit: string
    optional?: boolean
    typeName?: string | null
    subTypeName?: string | null
    isAlcoholic?: boolean | null
}

/**
 * Build a pantry lookup map from raw pantry query results.
 *
 * One row per ingredient (unique constraint). Only the pantry quantity (`quantity`)
 * is used as source of truth for grocery calculations — shoppingQuantity is ignored.
 * isInShoppingList is preserved for display purposes only.
 */
export function buildPantryMap(pantryItems: PantryItemLike[]): Map<string, PantryEntry> {
    const map = new Map<string, PantryEntry>()
    for (const p of pantryItems) {
        map.set(p.ingredientId, {
            quantity:         p.isInPantry ? (p.quantity ?? 0) : 0,
            unit:             p.unitLeft ?? resolveIngredientUnitFallback({
                ingredientName: p.ingredient?.name,
                typeName: p.ingredient?.type?.name,
                subTypeName: p.ingredient?.subType?.name,
                isAlcoholic: p.ingredient?.isAlcoholic,
            }),
            isInShoppingList: p.isInShoppingList ?? false,
        })
    }
    return map
}

/**
 * Aggregate a flat list of needed ingredients (already scaled by quantity/servings)
 * into a de-duplicated map, converting units when ingredients repeat.
 */
export function aggregateNeeded(
    ingredients: NeededIngredient[],
): Map<string, {
    name: string
    amount: number
    unit: string
    typeName?: string | null
    subTypeName?: string | null
    isAlcoholic?: boolean | null
}> {
    const needed = new Map<string, {
        name: string
        amount: number
        unit: string
        typeName?: string | null
        subTypeName?: string | null
        isAlcoholic?: boolean | null
    }>()

    for (const ing of ingredients) {
        if (ing.optional || ing.amount <= 0) continue
        const existing = needed.get(ing.ingredientId)
        if (existing) {
            const converted = convertUnit(ing.amount, ing.unit, existing.unit, {
                ingredientName: ing.ingredientName,
                typeName: ing.typeName,
                subTypeName: ing.subTypeName,
                isAlcoholic: ing.isAlcoholic,
            })
            if (converted != null) {
                existing.amount += converted
            }
            if (existing.typeName == null && ing.typeName != null) existing.typeName = ing.typeName
            if (existing.subTypeName == null && ing.subTypeName != null) existing.subTypeName = ing.subTypeName
            if (existing.isAlcoholic == null && ing.isAlcoholic != null) existing.isAlcoholic = ing.isAlcoholic
        } else {
            needed.set(ing.ingredientId, {
                name:   ing.ingredientName,
                amount: ing.amount,
                unit:   ing.unit,
                ...(ing.typeName != null ? { typeName: ing.typeName } : {}),
                ...(ing.subTypeName != null ? { subTypeName: ing.subTypeName } : {}),
                ...(ing.isAlcoholic != null ? { isAlcoholic: ing.isAlcoholic } : {}),
            })
        }
    }

    return needed
}

/**
 * Given aggregated needed ingredients and a pantry map, compute the sorted grocery list.
 */
export function computeGroceryList(
    needed: Map<string, {
        name: string
        amount: number
        unit: string
        typeName?: string | null
        subTypeName?: string | null
        isAlcoholic?: boolean | null
    }>,
    pantryMap: Map<string, PantryEntry>,
): GroceryItem[] {
    const groceryList: GroceryItem[] = []

    for (const [ingredientId, need] of needed) {
        const pantry = pantryMap.get(ingredientId)
        let inPantryAmount = 0

        if (pantry) {
            const converted = convertUnit(pantry.quantity, pantry.unit, need.unit, {
                ingredientName: need.name,
                typeName: need.typeName,
                subTypeName: need.subTypeName,
                isAlcoholic: need.isAlcoholic,
            })
            if (converted != null) {
                inPantryAmount = converted
            } else if (pantry.unit === need.unit) {
                inPantryAmount = pantry.quantity
            }
        }

        const missing = Math.max(0, need.amount - inPantryAmount)

        groceryList.push({
            ingredientId,
            ingredientName: need.name,
            totalNeeded:    +need.amount.toFixed(2),
            unit:           need.unit,
            inPantry:       +inPantryAmount.toFixed(2),
            missing:        +missing.toFixed(2),
            inWishlist:     pantry?.isInShoppingList ?? false,
        })
    }

    groceryList.sort((a, b) => {
        if (a.missing > 0 && b.missing === 0) return -1
        if (a.missing === 0 && b.missing > 0) return 1
        return a.ingredientName.localeCompare(b.ingredientName)
    })

    return groceryList
}
