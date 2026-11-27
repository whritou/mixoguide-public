'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import AddIngredientsModal, { type GroceryItem } from '@/components/AddIngredientsModal'
import CanYouMakeIt from '@/components/home/cocktails/CanYouMakeIt'
import UnitPicker from '@/components/home/cocktails/UnitPicker'
import { useCocktailIngredientPantry } from '@/hooks/useCocktailIngredientPantry'
import { invalidators } from '@/lib/invalidation'
import type { CocktailIngredient } from '@/types/models/cocktail'
import { convertUnit, roundForServings } from '@/utils/unitConversion'
import { isBlockingCocktailIngredient, isNonBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'

type Unit = 'ml' | 'cl' | 'oz'

function unitContext(row: CocktailIngredient) {
    return {
        ingredientName: row.ingredient?.name,
        typeName: row.ingredient?.type?.name,
        subTypeName: row.ingredient?.subType?.name,
        isAlcoholic: row.ingredient?.isAlcoholic,
    }
}

/**
 * Interactive recipe panel: unit picker, servings, per-ingredient pantry status
 * for signed-in users, "Can you make it?" for guests. Server-rendered with the
 * default unit/servings, so the recipe is in the initial HTML.
 */
export function CocktailIngredientsPanel({
    cocktailId,
    ingredients,
}: {
    cocktailId: string
    ingredients: CocktailIngredient[]
}) {
    const { data: session, status: authStatus } = useSession()
    const isAuthenticated = authStatus === 'authenticated'
    const qc = useQueryClient()

    const [unit, setUnit] = useState<Unit>('oz')
    const [servings, setServings] = useState(1)
    const [addIngredientsOpen, setAddIngredientsOpen] = useState(false)
    const [shoppingLoading, setShoppingLoading] = useState<Record<string, boolean>>({})

    const ingredientIds = useMemo(() => ingredients.map((i) => i.ingredientId), [ingredients])
    const { getIngredientStatus, addToWishlist } = useCocktailIngredientPantry(
        isAuthenticated ? ingredientIds : [],
        { enabled: isAuthenticated },
    )

    const handleAddToShoppingList = async (ingredientId: string, amount?: number, neededUnit?: string) => {
        setShoppingLoading((s) => ({ ...s, [ingredientId]: true }))
        const ok = await addToWishlist(ingredientId, amount ?? 0, neededUnit)
        setShoppingLoading((s) => ({ ...s, [ingredientId]: false }))
        if (ok) toast.success('Added to shopping list')
        else toast.error('Could not add to shopping list')
    }

    const modalItems: GroceryItem[] = ingredients
        .filter(isBlockingCocktailIngredient)
        .map((row) => {
            const status      = getIngredientStatus(row.ingredientId)
            const neededUnit  = row.unit ?? 'pcs'
            const rawNeeded   = row.amount != null ? row.amount * servings : 1
            const totalNeeded = rawNeeded > 0 ? rawNeeded : 1

            let inPantryAmount = 0
            if (status.derivedFrom) {
                inPantryAmount = totalNeeded
            } else if (status.inPantry && status.pantryUnit) {
                const convertedPantry = convertUnit(status.pantryAmount, status.pantryUnit, neededUnit, unitContext(row))
                if (convertedPantry != null) {
                    inPantryAmount = convertedPantry
                } else if (status.pantryUnit === neededUnit) {
                    inPantryAmount = status.pantryAmount
                }
            }

            const missingAmount = Math.max(0, totalNeeded - inPantryAmount)
            return {
                ingredientId:   row.ingredientId,
                ingredientName: row.ingredient?.name ?? 'Ingredient',
                totalNeeded:    +totalNeeded.toFixed(2),
                unit:           neededUnit,
                inPantry:       +inPantryAmount.toFixed(2),
                missing:        +missingAmount.toFixed(2),
                inWishlist:     status.inWishlist,
            }
        })
    const totalIng = modalItems.length
    const missingCount = modalItems.filter(item => item.missing > 0).length
    const hasMissingIngredients = missingCount > 0
    const readinessCls = missingCount === 0 ? 'sage' : missingCount <= 2 ? 'amber' : 'rose'
    const readinessLabel = missingCount === 0
        ? 'Ready to mix'
        : `${missingCount} ingredient${missingCount === 1 ? '' : 's'} missing`

    return (
        <>
            {/* Readiness banner */}
            {session?.user && totalIng > 0 && (
                <div className={`flex justify-between px-4 py-3 rounded-lg ${
                    readinessCls === 'sage'  ? 'bg-success-bg text-success' :
                    readinessCls === 'amber' ? 'bg-warning-bg text-brand' :
                                               'bg-missing-bg text-missing'
                }`}>
                    <span>{readinessLabel}</span>
                    <b className="font-serif">{totalIng - missingCount} / {totalIng}</b>
                </div>
            )}

            {/* ingredients */}
            <section aria-labelledby="cocktail-ingredients">
                <div className="flex justify-between mb-4">
                    <h2 id="cocktail-ingredients" className="font-serif text-xl">Ingredients</h2>
                    <UnitPicker unit={unit} setUnit={setUnit} />
                </div>

                <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span id="cocktail-servings-label" className="text-xs text-fg-dim whitespace-nowrap">
                        Servings
                    </span>
                    <div className="flex items-center bg-surface-muted rounded-full h-8" role="group" aria-labelledby="cocktail-servings-label">
                        <button
                            type="button"
                            aria-label="Fewer servings"
                            onClick={() => setServings((s) => Math.max(1, s - 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-muted-hover"
                        >
                            −
                        </button>
                        <span className="w-8 text-center text-sm" aria-live="polite">
                            {servings}
                        </span>
                        <button
                            type="button"
                            aria-label="More servings"
                            onClick={() => setServings((s) => Math.min(24, s + 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-muted-hover"
                        >
                            +
                        </button>
                    </div>

                    {session?.user && hasMissingIngredients && (
                        <button
                            type="button"
                            onClick={() => setAddIngredientsOpen(true)}
                            className="h-8 px-3 rounded-full bg-brand hover:bg-brand/90 text-fg-on-brand text-[11px] md:text-sm leading-none flex items-center whitespace-nowrap"
                        >
                            Manage ingredients
                        </button>
                    )}
                </div>

                {/* list */}
                <ul className="divide-y divide-line">
                    {ingredients.map((row) => {
                        // ── RECIPE AMOUNT ─────────────────────────────
                        const neededUnit = row.unit ?? 'pcs'
                        const scaled = row.amount != null ? row.amount * servings : null

                        let displayAmt: number | null = null
                        let displayUnit: string = neededUnit

                        if (row.amount != null) {
                            const scaledAmount = row.amount * servings
                            const scaledInSelectedUnit = convertUnit(scaledAmount, neededUnit, unit, unitContext(row))

                            if (scaledInSelectedUnit != null) {
                                displayAmt = roundForServings(scaledInSelectedUnit, unit)
                                displayUnit = unit
                            } else {
                                displayAmt = roundForServings(scaledAmount, neededUnit)
                                displayUnit = neededUnit
                            }
                        }

                        // ── STATUS ─────────────────────────────
                        const status = getIngredientStatus(row.ingredientId)
                        const isNonBlocking = isNonBlockingCocktailIngredient(row)

                        // ── PANTRY ─────────────────────────────
                        let availableForCheck: number | null = null
                        let availableForDisplay: number | null = null
                        let availableDisplayUnit: string = neededUnit

                        if (status.inPantry && status.pantryUnit) {
                            const convertedForCheck = convertUnit(status.pantryAmount, status.pantryUnit, neededUnit, unitContext(row))
                            availableForCheck = convertedForCheck != null
                                ? convertedForCheck
                                : status.pantryUnit === neededUnit
                                    ? status.pantryAmount
                                    : null

                            const convertedForDisplay = convertUnit(status.pantryAmount, status.pantryUnit, unit, unitContext(row))
                            if (convertedForDisplay != null) {
                                availableForDisplay = roundForServings(convertedForDisplay, unit)
                                availableDisplayUnit = unit
                            } else {
                                availableForDisplay = roundForServings(status.pantryAmount, status.pantryUnit)
                                availableDisplayUnit = status.pantryUnit
                            }
                        }

                        const needed = isNonBlocking ? 0 : (scaled ?? 0)

                        const isEnough =
                            isNonBlocking ||
                            (status.inPantry &&
                            availableForCheck != null &&
                            availableForCheck >= needed)

                        const isOutOfStock = status.inPantry && status.pantryAmount === 0

                        // ── BADGE ─────────────────────────────
                        let badge: { label: string; className: string } | null = isNonBlocking
                            ? {
                                label: row.amount == null ? 'Not required' : 'Garnish',
                                className: 'bg-brand/10 text-brand',
                            }
                            : isAuthenticated
                                ? { label: 'Missing', className: 'bg-missing-bg text-missing' }
                                : null

                        if (isAuthenticated) {
                            if (!isNonBlocking && status.derivedFrom) {
                                badge = { label: 'Derived', className: 'bg-success-bg text-success' }
                            } else if (!isNonBlocking && status.inPantry) {
                                if (isEnough) {
                                    badge = { label: 'Ready', className: 'bg-success-bg text-success' }
                                } else if (isOutOfStock) {
                                    badge = { label: 'Out of stock', className: 'bg-missing-bg text-missing' }
                                } else {
                                    badge = { label: 'Not enough', className: 'bg-warning-bg text-brand' }
                                }
                            } else if (!isNonBlocking && status.inWishlist) {
                                badge = { label: 'In shopping list', className: 'bg-warning-bg text-brand' }
                            }
                        }

                        return (
                            <li
                                key={row.ingredientId}
                                className="grid grid-cols-[64px_1fr_auto] gap-4 py-3 items-center"
                            >
                                {/* amount */}
                                <div>
                                    <div className="font-serif">{displayAmt ?? '—'}</div>
                                    <div className="text-[10px] uppercase text-fg-dim">{displayUnit}</div>
                                </div>

                                {/* name + pantry */}
                                <div className="flex flex-col">
                                    <span>{row.ingredient?.name}</span>

                                    {status.inPantry && availableForDisplay != null && (
                                        <span className="text-xs text-fg-dim">
                                            {availableForDisplay === 0
                                                ? 'Out of stock'
                                                : `${availableForDisplay} ${availableDisplayUnit} available`}
                                        </span>
                                    )}

                                    {status.derivedFrom && (
                                        <span className="text-xs text-fg-dim italic">From another ingredient</span>
                                    )}
                                </div>

                                {/* actions */}
                                <div className="flex items-center gap-2">
                                    {badge && (
                                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${badge.className}`}>
                                            {badge.label}
                                        </span>
                                    )}

                                    {isAuthenticated && !isNonBlocking && !status.inWishlist && !isEnough && !status.derivedFrom && (
                                        <button
                                            type="button"
                                            aria-label={`Add ${row.ingredient?.name ?? 'ingredient'} to shopping list`}
                                            onClick={() => handleAddToShoppingList(row.ingredientId, scaled ?? undefined, neededUnit)}
                                            disabled={shoppingLoading[row.ingredientId]}
                                            className="w-6 h-6 flex items-center justify-center rounded-full bg-surface-muted hover:bg-surface-muted-hover"
                                        >
                                            +
                                        </button>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </section>

            {authStatus === 'unauthenticated' && (
                <CanYouMakeIt
                    cocktailId={cocktailId}
                    ingredients={ingredients.map((row) => ({
                        id: row.ingredientId,
                        name: row.ingredient?.name ?? 'Ingredient',
                        optional: row.optional,
                        amount: row.amount,
                        unit: row.unit,
                        type: row.ingredient?.type?.name,
                        subType: row.ingredient?.subType?.name,
                    }))}
                />
            )}

            {session?.user && (
                <AddIngredientsModal
                    open={addIngredientsOpen}
                    onClose={() => setAddIngredientsOpen(false)}
                    collectionId={cocktailId}
                    submitUrl={`/api/cocktails/${cocktailId}/add-ingredients`}
                    items={modalItems}
                    onSuccess={(result) => {
                        toast.success(`${result.shopping} added to shopping - ${result.pantry} added to pantry`)
                        setAddIngredientsOpen(false)
                        void invalidators.pantry(qc)
                    }}
                />
            )}
        </>
    )
}
