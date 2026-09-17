'use client'

import type { Session } from 'next-auth'
import UnitPicker from '@/components/home/cocktails/UnitPicker'
import type { CocktailIngredient } from '@/types/models/cocktail'
import type { IngredientStatusInfo } from '@/hooks/useCocktailIngredientPantry'
import { convertUnit, roundForServings } from '@/utils/unitConversion'
import { isNonBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'

type Unit = 'ml' | 'cl' | 'oz'

interface CocktailIngredientsProps {
    ingredients:          CocktailIngredient[]
    session:              Session | null
    unit:                 Unit
    setUnit:              (u: Unit) => void
    servings:             number
    setServings:          (fn: (s: number) => number) => void
    getIngredientStatus:  (id: string) => IngredientStatusInfo
    shoppingLoading:      Record<string, boolean>
    onAddToShoppingList:  (id: string, amount?: number, unit?: string) => Promise<void>
    hasMissingIngredients: boolean
    onOpenManage:         () => void
}

export function CocktailIngredients({
    ingredients,
    session,
    unit,
    setUnit,
    servings,
    setServings,
    getIngredientStatus,
    shoppingLoading,
    onAddToShoppingList,
    hasMissingIngredients,
    onOpenManage,
}: CocktailIngredientsProps) {
    return (
        <div>
            <div className="flex justify-between mb-4">
                <h3 className="font-serif text-xl">Ingredients</h3>
                <UnitPicker unit={unit} setUnit={setUnit} />
            </div>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-xs text-mg-dim whitespace-nowrap">Servings</span>
                <div className="flex items-center bg-mg-parchment rounded-full h-8">
                    <button
                        onClick={() => setServings(s => Math.max(1, s - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mg-parchment-hover"
                    >
                        −
                    </button>
                    <span className="w-8 text-center text-sm">{servings}</span>
                    <button
                        onClick={() => setServings(s => Math.min(24, s + 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mg-parchment-hover"
                    >
                        +
                    </button>
                </div>

                {session?.user && hasMissingIngredients && (
                    <button
                        onClick={onOpenManage}
                        className="h-8 px-3 rounded-full bg-mg-brown hover:bg-mg-brown/90 text-white text-[11px] md:text-sm leading-none flex items-center whitespace-nowrap"
                    >
                        Manage ingredients
                    </button>
                )}
            </div>

            <div className="divide-y divide-[#e8e3dc]">
                {ingredients.map((row) => {
                    const neededUnit  = row.unit ?? 'pcs'
                    const scaled      = row.amount != null ? row.amount * servings : null
                    const status      = getIngredientStatus(row.ingredientId)
                    const isNonBlocking = isNonBlockingCocktailIngredient(row)

                    let displayAmt: number | null = null
                    let displayUnit: string = neededUnit

                    if (row.amount != null) {
                        const scaledAmount        = row.amount * servings
                        const scaledInSelectedUnit = convertUnit(scaledAmount, neededUnit, unit, {
                            ingredientName: row.ingredient?.name,
                            typeName: row.ingredient?.type?.name,
                            subTypeName: row.ingredient?.subType?.name,
                            isAlcoholic: row.ingredient?.isAlcoholic,
                        })
                        if (scaledInSelectedUnit != null) {
                            displayAmt  = roundForServings(scaledInSelectedUnit, unit)
                            displayUnit = unit
                        } else {
                            displayAmt  = roundForServings(scaledAmount, neededUnit)
                            displayUnit = neededUnit
                        }
                    }

                    let availableForCheck:   number | null = null
                    let availableForDisplay: number | null = null
                    let availableDisplayUnit: string = neededUnit

                    if (status.inPantry && status.pantryUnit) {
                        const convertedForCheck = convertUnit(status.pantryAmount, status.pantryUnit, neededUnit, {
                            ingredientName: row.ingredient?.name,
                            typeName: row.ingredient?.type?.name,
                            subTypeName: row.ingredient?.subType?.name,
                            isAlcoholic: row.ingredient?.isAlcoholic,
                        })
                        availableForCheck = convertedForCheck != null
                            ? convertedForCheck
                            : status.pantryUnit === neededUnit ? status.pantryAmount : null

                        const convertedForDisplay = convertUnit(status.pantryAmount, status.pantryUnit, unit, {
                            ingredientName: row.ingredient?.name,
                            typeName: row.ingredient?.type?.name,
                            subTypeName: row.ingredient?.subType?.name,
                            isAlcoholic: row.ingredient?.isAlcoholic,
                        })
                        if (convertedForDisplay != null) {
                            availableForDisplay  = roundForServings(convertedForDisplay, unit)
                            availableDisplayUnit = unit
                        } else {
                            availableForDisplay  = roundForServings(status.pantryAmount, status.pantryUnit)
                            availableDisplayUnit = status.pantryUnit
                        }
                    }

                    const needed      = isNonBlocking ? 0 : (scaled ?? 0)
                    const isEnough    = isNonBlocking || (status.inPantry && availableForCheck != null && availableForCheck >= needed)
                    const isOutOfStock = status.inPantry && status.pantryAmount === 0

                    let badge = isNonBlocking
                        ? { label: row.amount == null ? 'Not required' : 'Garnish', className: 'bg-mg-brown/10 text-mg-brown' }
                        : { label: 'Missing', className: 'bg-mg-rust-light text-mg-rust' }
                    if (!isNonBlocking && status.derivedFrom) {
                        badge = { label: 'Derived',        className: 'bg-mg-sage-light text-mg-sage' }
                    } else if (!isNonBlocking && status.inPantry) {
                        if (isEnough)       badge = { label: 'Ready',        className: 'bg-mg-sage-light text-mg-sage' }
                        else if (isOutOfStock) badge = { label: 'Out of stock', className: 'bg-mg-rust-light text-mg-rust' }
                        else                badge = { label: 'Not enough',   className: 'bg-mg-amber-light text-mg-brown' }
                    } else if (!isNonBlocking && status.inWishlist) {
                        badge = { label: 'In shopping list', className: 'bg-mg-amber-light text-mg-brown' }
                    }

                    return (
                        <div
                            key={row.ingredientId}
                            className="grid grid-cols-[64px_1fr_auto] gap-4 py-3 items-center"
                        >
                            <div>
                                <div className="font-serif">{displayAmt ?? '—'}</div>
                                <div className="text-[10px] uppercase text-mg-dim">{displayUnit}</div>
                            </div>

                            <div className="flex flex-col">
                                <span>{row.ingredient?.name}</span>
                                {status.inPantry && availableForDisplay != null && (
                                    <span className="text-xs text-mg-dim">
                                        {availableForDisplay === 0
                                            ? 'Out of stock'
                                            : `${availableForDisplay} ${availableDisplayUnit} available`}
                                    </span>
                                )}
                                {status.derivedFrom && (
                                    <span className="text-xs text-mg-dim italic">From another ingredient</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${badge.className}`}>
                                    {badge.label}
                                </span>
                                {!isNonBlocking && !status.inWishlist && !isEnough && !status.derivedFrom && (
                                    <button
                                        onClick={() => onAddToShoppingList(row.ingredientId, scaled ?? undefined, neededUnit)}
                                        disabled={shoppingLoading[row.ingredientId]}
                                        className="w-6 h-6 flex items-center justify-center rounded-full bg-mg-parchment hover:bg-mg-parchment-hover"
                                    >
                                        +
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
