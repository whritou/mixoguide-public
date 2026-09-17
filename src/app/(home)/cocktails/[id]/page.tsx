'use client'

import { ArrowLeft, CalendarDays, FlaskConical, Printer } from 'lucide-react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useReducer } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import PlanCocktailDialog  from '@/components/home/planned-cocktails/dialog/PlanCocktailDialog'
import AddIngredientsModal, { type GroceryItem } from '@/components/AddIngredientsModal'
import MakeCocktailDialog  from '@/components/home/cocktails/MakeCocktailDialog'
import SuggestionDialog    from '@/components/home/suggestions/SuggestionDialog'
import type { PlanState } from '@/components/home/cocktails/CocktailHero'
import { useRateMutation } from '@/hooks/mutations/use-rate-mutation'
import UnitPicker from '@/components/home/cocktails/UnitPicker'
import StarRating, { StarRatingDisplay } from '@/components/StarRating'
import { useCocktailIngredientPantry } from '@/hooks/useCocktailIngredientPantry'
import { useWakeLock }                 from '@/hooks/useWakeLock'
import { useQueryClient }              from '@tanstack/react-query'
import { invalidators }               from '@/lib/invalidation'
import type { CocktailIngredient }    from '@/types/models/cocktail'
import { useCocktailQuery }           from '@/hooks/queries/use-cocktails'
import { useRatingsQuery }            from '@/hooks/queries/use-ratings'
import { convertUnit, roundForServings } from '@/utils/unitConversion'
import { reportError } from '@/utils/reportError'
import { isBlockingCocktailIngredient, isNonBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'


type Unit = 'ml' | 'cl' | 'oz'

type PageState = {
    unit: Unit
    servings: number
    planDialogOpen: boolean
    makeDialogOpen: boolean
    suggestionDialogOpen: boolean
    addIngredientsOpen: boolean
    planState: PlanState | null
    completing: boolean
    shoppingLoading: Record<string, boolean>
}

type PageAction =
    | { type: 'SET_UNIT'; unit: Unit }
    | { type: 'SET_SERVINGS'; servings: number }
    | { type: 'SET_DIALOG'; dialog: 'plan' | 'make' | 'suggestion' | 'addIngredients'; open: boolean }
    | { type: 'SET_PLAN_STATE'; planState: PlanState | null }
    | { type: 'SET_COMPLETING'; completing: boolean }
    | { type: 'SET_SHOPPING_LOADING'; id: string; loading: boolean }

const initialPageState: PageState = {
    unit: 'oz',
    servings: 1,
    planDialogOpen: false,
    makeDialogOpen: false,
    suggestionDialogOpen: false,
    addIngredientsOpen: false,
    planState: null,
    completing: false,
    shoppingLoading: {},
}

function pageReducer(state: PageState, action: PageAction): PageState {
    switch (action.type) {
        case 'SET_UNIT':
            return { ...state, unit: action.unit }
        case 'SET_SERVINGS':
            return { ...state, servings: action.servings }
        case 'SET_DIALOG':
            return {
                ...state,
                planDialogOpen:       action.dialog === 'plan'           ? action.open : state.planDialogOpen,
                makeDialogOpen:       action.dialog === 'make'           ? action.open : state.makeDialogOpen,
                suggestionDialogOpen: action.dialog === 'suggestion'     ? action.open : state.suggestionDialogOpen,
                addIngredientsOpen:   action.dialog === 'addIngredients' ? action.open : state.addIngredientsOpen,
            }
        case 'SET_PLAN_STATE':
            return { ...state, planState: action.planState }
        case 'SET_COMPLETING':
            return { ...state, completing: action.completing }
        case 'SET_SHOPPING_LOADING':
            return { ...state, shoppingLoading: { ...state.shoppingLoading, [action.id]: action.loading } }
    }
}

function formatLabel(str: string) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function Page() {
    const { id }          = useParams() as { id: string }
    const router = useRouter()
    const { data: cocktail } = useCocktailQuery(id)
    const [state, dispatch]  = useReducer(pageReducer, initialPageState)
    const {
        unit, servings,
        planDialogOpen, makeDialogOpen, suggestionDialogOpen, addIngredientsOpen,
        planState, completing, shoppingLoading,
    } = state
    useWakeLock()

    const { data: session, status: authStatus } = useSession()

    const { data }   = useRatingsQuery({ cocktailId: id })
    const ratings    = data?.items ?? []
    const qc         = useQueryClient()
    const userRating = ratings.find(r => r.userId === session?.user?.id)?.rating ?? null

    const { ratingStats, ratingLoading, handleRate } = useRateMutation({
        cocktailId: id,
        initialStats: { avg: cocktail?.avgRating ?? null, count: cocktail?.ratingCount ?? 0 },
        userRating,
    })

    const ingredientIds = cocktail?.ingredients?.map((i: CocktailIngredient) => i.ingredientId) ?? []
    const { getIngredientStatus, addToWishlist } = useCocktailIngredientPantry(
        authStatus === 'authenticated' ? ingredientIds : []
    )

    const refreshPlanState = useCallback(() => {
        fetch(`/api/planned-cocktails/exist?cocktailId=${id}`)
            .then(r => r.json())
            .then(d => dispatch({ type: 'SET_PLAN_STATE', planState: d.data ?? d }))
            .catch((e) => reportError(e, 'refreshPlanState'))
    }, [id])

    useEffect(() => {
        if (authStatus !== 'authenticated' || !id) return
        refreshPlanState()
    }, [id, authStatus, refreshPlanState])

    const handleCompleted = async () => {
        if (!planState?.plannedCocktailId) return
        dispatch({ type: 'SET_COMPLETING', completing: true })
        try {
            const res = await fetch(`/api/planned-cocktails/${planState.plannedCocktailId}/complete`, { method: 'POST' })
            if (!res.ok) throw new Error()
            dispatch({ type: 'SET_PLAN_STATE', planState: planState ? { ...planState, status: 'done' } : null })
            toast.success('Cocktail marked as done! Pantry updated')
        } catch {
            toast.error('Could not mark as done')
        } finally {
            dispatch({ type: 'SET_COMPLETING', completing: false })
        }
    }

    const handleAddToShoppingList = async (ingredientId: string, amount?: number, unit?: string) => {
        dispatch({ type: 'SET_SHOPPING_LOADING', id: ingredientId, loading: true })
        const ok = await addToWishlist(ingredientId, amount ?? 0, unit)
        dispatch({ type: 'SET_SHOPPING_LOADING', id: ingredientId, loading: false })
        if (ok) toast.success('Added to shopping list')
        else toast.error('Could not add to shopping list')
    }

    if (!cocktail) return null

    const modalItems: GroceryItem[] = (cocktail.ingredients ?? [])
        .filter(isBlockingCocktailIngredient)
        .map((row: CocktailIngredient) => {
            const status     = getIngredientStatus(row.ingredientId)
            const neededUnit = row.unit ?? 'pcs'
            const rawNeeded  = row.amount != null ? row.amount * servings : 1
            const totalNeeded = rawNeeded > 0 ? rawNeeded : 1

            let inPantryAmount = 0
            if (status.derivedFrom) {
                inPantryAmount = totalNeeded
            } else if (status.inPantry && status.pantryUnit) {
                const convertedPantry = convertUnit(status.pantryAmount, status.pantryUnit, neededUnit, {
                    ingredientName: row.ingredient?.name,
                    typeName: row.ingredient?.type?.name,
                    subTypeName: row.ingredient?.subType?.name,
                    isAlcoholic: row.ingredient?.isAlcoholic,
                })
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
    const tags = [
        ...(cocktail.flavors ?? []),
        ...(cocktail.occasions ?? []),
    ].map(formatLabel)
    const techniques = (cocktail.technique ?? []).map(formatLabel)
    const barTools = cocktail.barTools ?? []
    const metaLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 font-mono'
    const metaValueClass = 'text-base font-medium leading-tight text-white'
    const metaChipClass = 'rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium leading-tight text-white/95'

    const handleGoBack = () => {
        if (window.history.length > 1) {
            router.back()
            return
        }
        router.push('/cocktails')
    }


    return (
        <main className="min-h-screen bg-[#faf7f1] px-4 md:px-10 pt-8 pb-40 md:pb-8">
            <div className="md:hidden max-w-6xl mx-auto mb-4">
                <button
                    onClick={handleGoBack}
                    className="h-8 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-label uppercase tracking-widest border border-mg-sand text-mg-muted bg-white/85 hover:bg-mg-linen hover:text-mg-charcoal hover:border-mg-caramel/40 transition-colors"
                >
                    <ArrowLeft size={13} />
                    Back
                </button>
            </div>
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 rounded-2xl overflow-hidden border border-[#e8e3dc] bg-white">

                {/* ── LEFT ───────────────────────────────────────────── */}
                <div className="relative flex flex-col justify-between p-14 text-white bg-[linear-gradient(165deg,#2a1e12,#5a3820)] overflow-hidden">

                    <div className="absolute right-[-120px] top-[-120px] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(216,150,90,0.55),transparent_60%)]" />

                    {cocktail.imageUrl && (
                        <Image
                            src={cocktail.imageUrl}
                            alt=""
                            fill
                            className="object-cover opacity-20"
                            priority
                        />
                    )}

                    <div className="relative z-10 flex flex-col gap-6 h-full">

                        <div>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-white/80 font-mono">
                                {cocktail.origin ?? cocktail.difficulty}
                            </p>

                            <h1 className="font-serif text-[64px] leading-none font-light tracking-[-0.02em] mt-3">
                                <em className="text-[#d9b384] not-italic">{cocktail.name}</em>
                            </h1>

                            {cocktail.description && (
                                <p className="mt-4 text-sm text-white/90">
                                    {cocktail.description}
                                </p>
                            )}
                        </div>

                        {/* tags */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.slice(0, 6).map((t, i) => (
                                    <span key={i} className="px-3 py-1 text-xs rounded-full bg-white/10">
                                      {t}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* rating */}
                        <div className="flex flex-wrap items-start gap-5">
                            <div className="flex flex-col gap-1.5">
                                <span className={metaLabelClass}>
                                    Overall Rating
                                </span>
                                <StarRatingDisplay
                                    avg={ratingStats.avg ?? 0}
                                    count={ratingStats.count}
                                    size={18}
                                    textLight
                                />
                            </div>

                            {session?.user && (
                                <div className="flex flex-col gap-1.5">
                                    <span className={metaLabelClass}>
                                        Your rating
                                    </span>
                                    <StarRating
                                        value={userRating ?? 0}
                                        size={18}
                                        interactive={!ratingLoading && authStatus === 'authenticated'}
                                        onChange={handleRate}
                                    />
                                </div>
                            )}
                        </div>

                        {/* specs */}
                        <div className="flex flex-wrap gap-x-7 gap-y-4 pt-5 border-t border-white/15">
                            {cocktail.preparationTime && cocktail.preparationTime > 0 && (
                                <div>
                                    <span className={metaLabelClass}>Time</span>
                                    <div className={metaValueClass}>{cocktail.preparationTime} min</div>
                                </div>
                            )}
                            {cocktail.difficulty && (
                                <div>
                                    <span className={metaLabelClass}>Difficulty</span>
                                    <div className={metaValueClass}>{formatLabel(cocktail.difficulty)}</div>
                                </div>
                            )}
                            {cocktail.glass?.name && (
                                <div>
                                    <span className={metaLabelClass}>Glass</span>
                                    <div className={metaValueClass}>{cocktail.glass.name}</div>
                                </div>
                            )}
                        </div>

                        {(techniques.length > 0 || barTools.length > 0) && (
                            <div className="grid gap-4 pt-5 border-t border-white/15 md:grid-cols-2">
                                {techniques.length > 0 && (
                                    <section aria-labelledby="cocktail-techniques">
                                        <h2
                                            id="cocktail-techniques"
                                            className={`mb-2 ${metaLabelClass}`}
                                        >
                                            Technique{techniques.length === 1 ? '' : 's'}
                                        </h2>
                                        <div className="flex flex-wrap gap-1.5">
                                            {techniques.map((technique) => (
                                                <span
                                                    key={technique}
                                                    className={metaChipClass}
                                                >
                                                    {technique}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {barTools.length > 0 && (
                                    <section aria-labelledby="cocktail-bar-tools">
                                        <h2
                                            id="cocktail-bar-tools"
                                            className={`mb-2 ${metaLabelClass}`}
                                        >
                                            Bar tools
                                        </h2>
                                        <div className="flex flex-wrap gap-1.5">
                                            {barTools.map(({ barTool }) => (
                                                <span
                                                    key={barTool.id}
                                                    className={`inline-flex items-center gap-1.5 ${metaChipClass}`}
                                                >
                                                    {barTool.name}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}

                        {/* plan state */}
                        {planState?.exists && (
                            <div className="text-sm text-white/90 flex items-center gap-2">
                                {planState.status === "planned" && (
                                    <>
                                        <CalendarDays size={13} />
                                        Planned
                                    </>
                                )}
                                {planState.status === "done" && (
                                    <>
                                        ✓ Done
                                    </>
                                )}
                            </div>
                        )}

                        {/* actions */}
                        {session?.user && (
                            <>
                                <div className="hidden md:flex flex-wrap gap-2 mt-auto pt-6 border-t border-white/15">
                                    <button
                                        onClick={() => dispatch({ type: 'SET_DIALOG', dialog: 'make', open: true })}
                                        className="px-4 py-2.5 rounded-full bg-white text-[#181715] text-sm flex items-center gap-2 hover:bg-white/90 whitespace-nowrap"
                                    >
                                        <FlaskConical size={14} /> Make now
                                    </button>

                                    <button
                                        onClick={() => dispatch({ type: 'SET_DIALOG', dialog: 'plan', open: true })}
                                        className="px-4 py-2.5 rounded-full border border-white/30 text-sm flex items-center gap-2 hover:bg-white/10 whitespace-nowrap"
                                    >
                                        <CalendarDays size={14} /> Plan
                                    </button>

                                    <a
                                        href={`/api/cocktails/${id}/pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2.5 rounded-full border border-white/30 text-sm flex items-center gap-2 hover:bg-white/10 whitespace-nowrap"
                                    >
                                        <Printer size={14} /> PDF
                                    </a>

                                    {planState?.status === "planned" && (
                                        <button
                                            onClick={handleCompleted}
                                            disabled={completing}
                                            className="px-4 py-2.5 rounded-full border border-white/30 text-sm hover:bg-white/10 flex items-center gap-2 whitespace-nowrap"
                                        >
                                            {completing ? "Saving…" : "Mark done"}
                                        </button>
                                    )}
                                </div>

                                {planState?.status === "planned" && (
                                    <button
                                        onClick={handleCompleted}
                                        disabled={completing}
                                        className="md:hidden mt-2 px-4 py-2 rounded-full border border-white/30 hover:bg-white/10 flex items-center gap-2 w-fit"
                                    >
                                        {completing ? "Saving…" : "Mark done"}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="p-10 flex flex-col gap-6">
                    {/* Readiness banner */}
                    {session?.user && totalIng > 0 && (
                        <div className={`flex justify-between px-4 py-3 rounded-lg ${
                            readinessCls === 'sage'  ? 'bg-mg-sage-light text-mg-sage' :
                            readinessCls === 'amber' ? 'bg-mg-amber-light text-mg-brown' :
                                                       'bg-mg-rust-light text-mg-rust'
                        }`}>
                            <span>{readinessLabel}</span>
                            <b className="font-serif">{totalIng - missingCount} / {totalIng}</b>
                        </div>
                    )}

                    {/* ingredients */}
                    <div>
                        <div className="flex justify-between mb-4">
                            <h3 className="font-serif text-xl">Ingredients</h3>
                            <UnitPicker unit={unit} setUnit={(u) => dispatch({ type: 'SET_UNIT', unit: u })} />
                        </div>

                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                            <span className="text-xs text-mg-dim whitespace-nowrap">
                                Servings
                            </span>
                            <div className="flex items-center bg-mg-parchment rounded-full h-8">
                                <button
                                    onClick={() => dispatch({ type: 'SET_SERVINGS', servings: Math.max(1, servings - 1) })}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mg-parchment-hover"
                                >
                                    −
                                </button>
                                <span className="w-8 text-center text-sm">
                                    {servings}
                                </span>
                                <button
                                    onClick={() => dispatch({ type: 'SET_SERVINGS', servings: Math.min(24, servings + 1) })}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mg-parchment-hover"
                                >
                                    +
                                </button>
                            </div>

                            {session?.user && hasMissingIngredients && (
                                <button
                                    onClick={() => dispatch({ type: 'SET_DIALOG', dialog: 'addIngredients', open: true })}
                                    className="h-8 px-3 rounded-full bg-mg-brown hover:bg-mg-brown/90 text-white text-[11px] md:text-sm leading-none flex items-center whitespace-nowrap"
                                >
                                    Manage ingredients
                                </button>
                            )}
                        </div>

                        {/* list */}
                        <div className="divide-y divide-[#e8e3dc]">
                            {cocktail.ingredients?.map((row) => {
                                // ── RECIPE AMOUNT ─────────────────────────────
                                const neededUnit = row.unit ?? 'pcs'
                                const scaled =
                                    row.amount != null ? row.amount * servings : null

                                let displayAmt: number | null = null
                                let displayUnit: string = neededUnit

                                if (row.amount != null) {
                                    const scaledAmount = row.amount * servings
                                    const scaledInSelectedUnit = convertUnit(scaledAmount, neededUnit, unit, {
                                        ingredientName: row.ingredient?.name,
                                        typeName: row.ingredient?.type?.name,
                                        subTypeName: row.ingredient?.subType?.name,
                                        isAlcoholic: row.ingredient?.isAlcoholic,
                                    })

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

                                // ── PANTRY (ALWAYS SHOW IF inPantry) ─────────────────────────────
                                let availableForCheck: number | null = null
                                let availableForDisplay: number | null = null
                                let availableDisplayUnit: string = neededUnit

                                if (status.inPantry && status.pantryUnit) {
                                    const convertedForCheck = convertUnit(
                                        status.pantryAmount,
                                        status.pantryUnit,
                                        neededUnit,
                                        {
                                            ingredientName: row.ingredient?.name,
                                            typeName: row.ingredient?.type?.name,
                                            subTypeName: row.ingredient?.subType?.name,
                                            isAlcoholic: row.ingredient?.isAlcoholic,
                                        }
                                    )
                                    availableForCheck = convertedForCheck != null
                                        ? convertedForCheck
                                        : status.pantryUnit === neededUnit
                                            ? status.pantryAmount
                                            : null

                                    const convertedForDisplay = convertUnit(
                                        status.pantryAmount,
                                        status.pantryUnit,
                                        unit,
                                        {
                                            ingredientName: row.ingredient?.name,
                                            typeName: row.ingredient?.type?.name,
                                            subTypeName: row.ingredient?.subType?.name,
                                            isAlcoholic: row.ingredient?.isAlcoholic,
                                        }
                                    )
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

                                const isOutOfStock =
                                    status.inPantry &&
                                    status.pantryAmount === 0

                                // ── BADGE ─────────────────────────────
                                const isAuthenticated = authStatus === 'authenticated'

                                let badge: { label: string; className: string } | null = isNonBlocking
                                    ? {
                                        label: row.amount == null ? "Not required" : "Garnish",
                                        className: "bg-mg-brown/10 text-mg-brown",
                                    }
                                    : isAuthenticated
                                        ? {
                                            label: "Missing",
                                            className: "bg-mg-rust-light text-mg-rust",
                                        }
                                        : null

                                if (isAuthenticated) {
                                    if (!isNonBlocking && status.derivedFrom) {
                                        badge = {
                                            label: "Derived",
                                            className: "bg-mg-sage-light text-mg-sage",
                                        }
                                    } else if (!isNonBlocking && status.inPantry) {
                                        if (isEnough) {
                                            badge = {
                                                label: "Ready",
                                                className: "bg-mg-sage-light text-mg-sage",
                                            }
                                        } else if (isOutOfStock) {
                                            badge = {
                                                label: "Out of stock",
                                                className: "bg-mg-rust-light text-mg-rust",
                                            }
                                        } else {
                                            badge = {
                                                label: "Not enough",
                                                className: "bg-mg-amber-light text-mg-brown",
                                            }
                                        }
                                    } else if (!isNonBlocking && status.inWishlist) {
                                        badge = {
                                            label: "In shopping list",
                                            className: "bg-mg-amber-light text-mg-brown",
                                        }
                                    }
                                }

                                return (
                                    <div
                                        key={row.ingredientId}
                                        className="grid grid-cols-[64px_1fr_auto] gap-4 py-3 items-center"
                                    >
                                        {/* amount */}
                                        <div>
                                            <div className="font-serif">
                                                {displayAmt ?? "—"}
                                            </div>
                                            <div className="text-[10px] uppercase text-mg-dim">
                                                {displayUnit}
                                            </div>
                                        </div>

                                        {/* name + pantry */}
                                        <div className="flex flex-col">
                                            <span>{row.ingredient?.name}</span>

                                            {status.inPantry && availableForDisplay != null && (
                                                <span className="text-xs text-mg-dim">
                                                    {availableForDisplay === 0
                                                        ? "Out of stock"
                                                        : `${availableForDisplay} ${availableDisplayUnit} available`}
                                                </span>
                                            )}

                                            {/* derived info */}
                                            {status.derivedFrom && (
                                                <span className="text-xs text-mg-dim italic">
                                                From another ingredient
                                            </span>
                                            )}
                                        </div>

                                        {/* actions */}
                                        <div className="flex items-center gap-2">
                                            {badge && (
                                                <span
                                                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${badge.className}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            )}

                                            {isAuthenticated && !isNonBlocking && !status.inWishlist && !isEnough && !status.derivedFrom && (
                                                <button
                                                    onClick={() =>
                                                        handleAddToShoppingList(
                                                            row.ingredientId,
                                                            scaled ?? undefined,
                                                            neededUnit
                                                        )
                                                    }
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

                    {/* method */}
                    {cocktail.instructions &&  cocktail.instructions?.length > 0 && (
                        <div>
                            <h3 className="font-serif text-xl mb-4">Method</h3>
                            <ol className="flex flex-col gap-4">
                                {cocktail.instructions.map((step, i) => (
                                    <li key={i} className="flex gap-4">
                                        <span className="text-mg-brown font-mono">{String(i + 1).padStart(2, '0')}</span>
                                        <p>{step}</p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            </div>

            {session?.user && (
                <div className="md:hidden fixed inset-x-4 bottom-24 z-40">
                    <div className="rounded-2xl border border-mg-bone/50 bg-mg-cream/95 backdrop-blur-md px-2 py-2 shadow-[0_12px_30px_rgba(27,28,26,0.18)] flex items-center gap-2">
                        <button
                            onClick={() => dispatch({ type: 'SET_DIALOG', dialog: 'make', open: true })}
                            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-br from-mg-brown to-mg-caramel text-white flex items-center justify-center gap-2 font-label text-[11px] uppercase tracking-widest"
                        >
                            <FlaskConical size={14} /> Make now
                        </button>
                        <button
                            onClick={() => dispatch({ type: 'SET_DIALOG', dialog: 'plan', open: true })}
                            className="flex-1 px-4 py-3 rounded-xl border border-[#cfb79e] bg-[#f4ece2] text-mg-brown flex items-center justify-center gap-2 font-label text-[11px] uppercase tracking-widest"
                        >
                            <CalendarDays size={14} /> Plan
                        </button>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            <PlanCocktailDialog
                cocktailId={id}
                cocktailName={cocktail.name}
                open={planDialogOpen}
                onOpenChange={(o) => dispatch({ type: 'SET_DIALOG', dialog: 'plan', open: o })}
                onPlanned={refreshPlanState}
            />
            <MakeCocktailDialog
                cocktailId={id}
                cocktailName={cocktail.name}
                open={makeDialogOpen}
                onOpenChange={(o) => dispatch({ type: 'SET_DIALOG', dialog: 'make', open: o })}
                onMade={refreshPlanState}
            />
            <SuggestionDialog
                open={suggestionDialogOpen}
                onOpenChange={(o) => dispatch({ type: 'SET_DIALOG', dialog: 'suggestion', open: o })}
                defaultType="MODIFY_COCKTAIL"
                targetId={id}
                targetName={cocktail.name}
            />
            <AddIngredientsModal
                open={addIngredientsOpen}
                onClose={() => dispatch({ type: 'SET_DIALOG', dialog: 'addIngredients', open: false })}
                collectionId={id}
                submitUrl={`/api/cocktails/${id}/add-ingredients`}
                items={modalItems}
                onSuccess={(result) => {
                    toast.success(`${result.shopping} added to shopping - ${result.pantry} added to pantry`)
                    dispatch({ type: 'SET_DIALOG', dialog: 'addIngredients', open: false })
                    invalidators.pantry(qc)
                }}
            />
        </main>
    )
}
