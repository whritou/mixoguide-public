'use client'

import { useCallback, useMemo } from 'react'
import { usePantryQuery } from '@/hooks/queries/use-pantry'
import { useDerivationsQuery } from '@/hooks/queries/use-derivations'
import { usePantryMutations } from '@/hooks/mutations/use-pantry-mutations'
import type { UserPantryItem } from '@/types/models/pantry'
import type { DerivationMap } from '@/lib/api/derivations.api'
import { convertUnit } from '@/utils/unitConversion'
import { resolveIngredientUnitFallback } from '@/utils/ingredientUnitFallback'

const LOW_THRESHOLDS: Record<string, number> = {
    cl: 10, ml: 100, oz: 3, g: 50, pcs: 2, zest: 2, slice: 2, twist: 2,
}

function computeStockLevel(qty: number, unit: string): 'ok' | 'low' | 'out' {
    if (qty === 0) return 'out'
    const threshold = LOW_THRESHOLDS[unit] ?? 5
    return qty <= threshold ? 'low' : 'ok'
}

export type IngredientStatusInfo = {
    inPantry:    boolean
    stockLevel:  'ok' | 'low' | 'out' | 'unknown'
    inWishlist:  boolean

    derivedFrom?: string
    pantryItem?: UserPantryItem

    pantryAmount: number
    pantryUnit: string | null
}

export function useCocktailIngredientPantry(ingredientIds: string[]) {
    const { data: pantryData, isLoading: loadingPantry } = usePantryQuery({ limit: 500 })
    const { data: derivations = {} as DerivationMap, isLoading: loadingDerivations } = useDerivationsQuery()
    const { add } = usePantryMutations()

    const pantryMap = useMemo(() => {
        const items = pantryData?.items ?? []
        if (!items.length || !ingredientIds.length) return {} as Record<string, UserPantryItem>

        const relevantBaseIds = new Set<string>()
        for (const ingId of ingredientIds) {
            for (const e of derivations[ingId] ?? []) relevantBaseIds.add(e.baseIngredientId)
        }

        const map: Record<string, UserPantryItem> = {}
        for (const item of items) {
            if (ingredientIds.includes(item.ingredientId) || relevantBaseIds.has(item.ingredientId)) {
                map[item.ingredientId] = item
            }
        }
        return map
    }, [pantryData?.items, derivations, ingredientIds])

    const getIngredientStatus = useCallback(
        (ingredientId: string): IngredientStatusInfo => {
            const item = pantryMap[ingredientId]

            // ── DIRECT ─────────────────────────────
            if (item) {
                return {
                    inPantry:   item.isInPantry,
                    inWishlist: item.isInShoppingList,

                    stockLevel: item.isInPantry
                        ? computeStockLevel(item.quantity, item.unitLeft)
                        : 'unknown',

                    pantryAmount: item.isInPantry ? item.quantity : 0,
                    pantryUnit:   item.unitLeft ?? null,

                    pantryItem: item,
                }
            }

            // ── DERIVED (no quantity info available) ─────────────
            for (const entry of derivations[ingredientId] ?? []) {
                const baseItem = pantryMap[entry.baseIngredientId]

                if (baseItem?.isInPantry) {
                    return {
                        inPantry: true,
                        inWishlist: false,
                        derivedFrom: entry.baseIngredientId,

                        stockLevel: computeStockLevel(
                            baseItem.quantity,
                            baseItem.unitLeft
                        ),

                        pantryAmount: 0,
                        pantryUnit: null,

                        pantryItem: baseItem,
                    }
                }
            }

            // ── NONE ─────────────────────────────
            return {
                inPantry: false,
                inWishlist: false,
                stockLevel: 'unknown',
                pantryAmount: 0,
                pantryUnit: null,
            }
        },
        [pantryMap, derivations]
    )

    const addToWishlist = useCallback(async (
        ingredientId: string,
        amount: number,
        unit?: string,
    ): Promise<boolean> => {
        const existing = pantryMap[ingredientId]
        const targetUnit = unit ?? existing?.unitLeft ?? resolveIngredientUnitFallback({
            ingredientName: existing?.ingredient?.name,
            typeName: existing?.ingredient?.type?.name,
            subTypeName: existing?.ingredient?.subType?.name,
            isAlcoholic: existing?.ingredient?.isAlcoholic,
        })
        const hasAmount = amount > 0
        let pantryQtyInTarget = 0

        if (existing?.isInPantry) {
            const context = {
                ingredientName: existing.ingredient?.name,
                typeName: existing.ingredient?.type?.name,
                subTypeName: existing.ingredient?.subType?.name,
                isAlcoholic: existing.ingredient?.isAlcoholic,
            }
            if (existing.unitLeft === targetUnit) {
                pantryQtyInTarget = existing.quantity ?? 0
            } else {
                const converted = convertUnit(existing.quantity ?? 0, existing.unitLeft, targetUnit, context)
                if (converted === null) return false
                pantryQtyInTarget = converted
            }
        }

        const missingInTarget = hasAmount ? Math.max(0, amount - pantryQtyInTarget) : null

        if (hasAmount && missingInTarget === 0) return true

        let upsertUnit = targetUnit
        let upsertQuantity = hasAmount ? missingInTarget! : 0

        if (existing?.unitLeft && upsertUnit !== existing.unitLeft && upsertQuantity > 0) {
            const convertedMissing = convertUnit(upsertQuantity, upsertUnit, existing.unitLeft, {
                ingredientName: existing.ingredient?.name,
                typeName: existing.ingredient?.type?.name,
                subTypeName: existing.ingredient?.subType?.name,
                isAlcoholic: existing.ingredient?.isAlcoholic,
            })
            if (convertedMissing === null) return false
            upsertUnit = existing.unitLeft
            upsertQuantity = convertedMissing
        }

        try {
            await add.mutateAsync({
                ingredientId,
                quantity:         upsertQuantity,
                unitLeft:         upsertUnit,
                isInPantry:       false,
                isInShoppingList: true,
            })
            return true
        } catch {
            return false
        }
    }, [pantryMap, add])

    return {
        loading: loadingPantry || loadingDerivations,
        getIngredientStatus,
        addToWishlist,
    }
}
