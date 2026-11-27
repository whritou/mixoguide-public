'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import {
    CalendarDays,
    CheckCheck,
    ChevronDown,
    ChevronUp,
    Loader2,
    RotateCcw,
    ShoppingCart,
    Trash2,
} from 'lucide-react'
import AddIngredientsModal, { type GroceryItem } from '@/components/AddIngredientsModal'
import RescheduleDialog from '@/components/home/planned-cocktails/dialog/RescheduleDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePlannedCocktailMutations } from '@/hooks/mutations/use-planned-cocktail-mutations'
import type { IngredientStatusInfo } from '@/hooks/useCocktailIngredientPantry'
import type { PlannedCocktail } from '@/types/models/planned-cocktail'
import { convertUnit } from '@/utils/unitConversion'
import { isBlockingCocktailIngredient, isNonBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'
import {
    formatMonthDay,
    isOverdueDate,
    isTodayDate,
    parseIsoDate,
    relativeDateLabel,
} from '@/lib/planner-dashboard/plannerDateUtils'

interface Props {
    item: PlannedCocktail
    now: Date
    onUpdate: () => void
    getIngredientStatus?: (id: string) => IngredientStatusInfo
}

const STOCK_COLOR: Record<string, string> = {
    ok: 'text-brand',
    low: 'text-brand-soft-strong',
    out: 'text-danger',
    unknown: 'text-fg-muted',
}

export default function PlannedCocktailCard({ item, now, onUpdate, getIngredientStatus }: Props) {
    const { update, remove, complete } = usePlannedCocktailMutations()

    const [showIngredients, setShowIngredients] = useState(false)
    const [rescheduleOpen, setRescheduleOpen] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [removing, setRemoving] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)

    const plannedDate = parseIsoDate(item.plannedFor)
    const isPast = isOverdueDate(plannedDate, now)
    const isToday = isTodayDate(plannedDate, now)
    const isDone = item.status === 'done'

    const formattedDate = `${formatMonthDay(plannedDate)} - ${relativeDateLabel(plannedDate, now, { eventStyle: true })}`

    const completedDate = item.completedAt
        ? new Date(item.completedAt).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        : null

    const ingredients = useMemo(() => item.cocktail?.ingredients ?? [], [item.cocktail?.ingredients])

    const modalItems = useMemo<GroceryItem[]>(() => {
        return ingredients.filter(isBlockingCocktailIngredient).map((ingredient) => {
            const status = getIngredientStatus?.(ingredient.ingredientId)
            const totalNeeded = ingredient.amount ? ingredient.amount * item.quantity : 1
            const neededUnit = ingredient.unit ?? 'pcs'
            let inPantry = 0

            if (status?.derivedFrom) {
                inPantry = totalNeeded
            } else if (status?.inPantry && status.pantryUnit) {
                const converted = convertUnit(status.pantryAmount, status.pantryUnit, neededUnit, {
                    ingredientName: ingredient.ingredient.name,
                    typeName: ingredient.ingredient.type?.name,
                    subTypeName: ingredient.ingredient.subType?.name,
                })
                if (converted != null) {
                    inPantry = converted
                } else if (status.pantryUnit === neededUnit) {
                    inPantry = status.pantryAmount
                }
            }

            const missing = Math.max(0, totalNeeded - inPantry)

            return {
                ingredientId: ingredient.ingredientId,
                ingredientName: ingredient.ingredient.name,
                totalNeeded,
                unit: neededUnit,
                inPantry,
                missing,
                inWishlist: status?.inWishlist ?? false,
            }
        })
    }, [getIngredientStatus, ingredients, item.quantity])

    const missingIngredientCount = modalItems.filter((entry) => entry.missing > 0).length
    const availabilityPill = !isDone && modalItems.length > 0
        ? missingIngredientCount === 0
            ? { label: 'READY', className: 'bg-success-bg text-success' }
            : {
                label: `${missingIngredientCount} MISSING`,
                className: 'bg-danger-bg text-danger',
            }
        : null

    const markDone = async () => {
        try {
            await complete.mutateAsync({ id: item.id, cocktailId: item.cocktailId })
            toast.success(`${item.quantity}x ${item.cocktail?.name} done - pantry updated`, {
                duration: 5000,
                action: {
                    label:   'Undo',
                    onClick: () => void undoDone(),
                },
            })
            onUpdate()
        } catch {
            toast.error('Could not mark as done')
        }
    }

    const undoDone = async () => {
        try {
            await update.mutateAsync({ id: item.id, data: { status: 'planned' } })
            toast.success('Moved back to planned')
            onUpdate()
        } catch {
            toast.error('Could not update status')
        }
    }

    const handleRemove = async () => {
        if (removing) return
        setRemoving(true)
        try {
            await remove.mutateAsync(item.id)
            toast.success('Removed from plan')
            onUpdate()
        } finally {
            setRemoving(false)
        }
    }

    const statusPill = isDone
        ? { label: 'DONE', className: 'bg-surface-inverse/75 text-fg-on-inverse inset-ring-1 inset-ring-fg/40' }
        : isPast
            ? { label: 'OVERDUE', className: 'bg-danger-bg text-danger' }
            : isToday
                ? { label: 'TODAY', className: 'bg-brand/15 text-brand' }
                : { label: 'PLANNED', className: 'bg-surface-inverse/75 text-fg-on-inverse inset-ring-1 inset-ring-fg/40' }

    return (
        <>
            <article
                className={`group relative max-w-xl overflow-hidden rounded-2xl shadow-xs bg-surface transition-all duration-300 hover:shadow-sm ${isDone ? 'opacity-80' : ''}`}
            >
                <button
                    type="button"
                    onClick={() => setConfirmRemove(true)}
                    disabled={removing}
                    className="absolute right-3 top-3 z-20 rounded-full bg-surface/90 p-1.5 text-fg-muted shadow-sm backdrop-blur-sm transition-colors hover:bg-danger-bg hover:text-danger disabled:opacity-50"
                    title="Remove from planner"
                    aria-label="Remove from planner"
                >
                    {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>

                <div className="flex min-h-[148px]">
                    <Link
                        href={`/cocktails/${item.cocktailId}`}
                        className="relative w-32 shrink-0 overflow-hidden bg-line sm:w-40"
                    >
                        <Image
                            src={item.cocktail?.imageUrl ?? '/placeholder.svg'}
                            alt={item.cocktail?.name ?? 'Cocktail'}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 128px, 160px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-overlay/33 to-transparent" />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 pr-8 sm:p-4 sm:pr-14">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-label uppercase tracking-widest ${statusPill.className}`}>
                                {statusPill.label}
                            </span>
                            {availabilityPill && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-label uppercase tracking-widest ${availabilityPill.className}`}>
                                    {availabilityPill.label}
                                </span>
                            )}
                            {item.quantity > 1 && (
                                <span className="rounded-full bg-surface-inverse/65 px-2 py-0.5 text-[10px] font-label uppercase tracking-widest text-fg-on-inverse inset-ring-1 inset-ring-fg/40">
                                    x{item.quantity}
                                </span>
                            )}
                        </div>

                        <div className="flex items-start justify-between gap-2">
                            <Link
                                href={`/cocktails/${item.cocktailId}`}
                                className="line-clamp-1 font-headline text-lg leading-tight text-fg transition-colors hover:text-brand"
                            >
                                {item.cocktail?.name ?? '-'}
                            </Link>
                        </div>

                        <p className={`flex flex-wrap items-center gap-1.5 text-xs ${isPast && !isDone ? 'text-danger' : 'text-fg-muted'}`}>
                            <CalendarDays size={12} />
                            <span>{formattedDate}</span>
                            {item.quantity > 1 && <span className="font-medium text-fg-secondary">({item.quantity} servings)</span>}
                        </p>

                        {!isDone && ingredients.length > 0 && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowIngredients((prev) => !prev)}
                                    className="flex items-center gap-1 text-xs text-fg-muted transition-colors hover:text-brand"
                                >
                                    {showIngredients ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {ingredients.length} ingredient{ingredients.length > 1 ? 's' : ''}
                                </button>

                                {showIngredients && (
                                    <ul className="mt-1.5 space-y-1">
                                        {ingredients.map((ingredient) => {
                                            const status = getIngredientStatus?.(ingredient.ingredientId)
                                            const scaledAmount = ingredient.amount ? ingredient.amount * item.quantity : null
                                            const isNonBlocking = isNonBlockingCocktailIngredient(ingredient)

                                            return (
                                                <li key={ingredient.ingredientId} className="flex items-center justify-between text-xs">
                                                    <div className="flex min-w-0 items-center gap-1.5">
                                                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                            isNonBlocking
                                                                ? 'bg-brand/30'
                                                                : status?.inPantry
                                                                ? status.stockLevel === 'ok'
                                                                    ? 'bg-brand'
                                                                    : status.stockLevel === 'low'
                                                                        ? 'bg-brand-soft'
                                                                        : 'bg-danger'
                                                                : 'bg-line-strong'
                                                        }`}
                                                        />
                                                        <span className="truncate text-fg-secondary">{ingredient.ingredient.name}</span>
                                                    </div>
                                                    <span className={`font-mono ${status ? STOCK_COLOR[status.stockLevel] : 'text-fg-muted'}`}>
                                                        {scaledAmount ? `${scaledAmount}${ingredient.unit ?? 'pcs'}` : '-'}
                                                    </span>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>
                        )}

                        <div className="mt-auto flex items-center gap-2 pt-1">
                          {missingIngredientCount > 0 && (
                              <button
                                  type="button"
                                  onClick={() => setShowAddModal(true)}
                                  className="inline-flex h-8 px-3 py-1.5 font-label uppercase tracking-widest gap-1 text-[11px]  items-center justify-center rounded-full border border-line-strong bg-surface text-fg-secondary transition-colors hover:bg-canvas-hover"
                                  title="Manage missing ingredients"
                                  aria-label="Manage missing ingredients"
                              >
                                  <ShoppingCart size={13} />

                                  <span className="hidden md:inline">
                                      Ingredients
                                  </span>
                              </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setRescheduleOpen(true)}
                            className="inline-flex h-8 px-3 py-1.5 font-label uppercase tracking-widest gap-1 text-[11px] items-center justify-center rounded-full border border-line-strong bg-surface text-fg-secondary transition-colors hover:bg-canvas-hover"
                            title="Reschedule"
                            aria-label="Reschedule"
                          >
                            <CalendarDays size={13} />
                            <span className="hidden md:inline">
                              Reschedule
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void markDone()}
                            className="ml-auto inline-flex h-8 items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-[11px] font-label uppercase tracking-widest text-fg-on-brand transition-colors hover:bg-brand/80"
                          >
                            <CheckCheck size={13} />
                            Done
                          </button>
                        </div>
                    </div>
                </div>
            </article>

            {!isDone && (
                <RescheduleDialog
                    item={item}
                    open={rescheduleOpen}
                    onOpenChange={setRescheduleOpen}
                    onRescheduled={onUpdate}
                />
            )}

            <AddIngredientsModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                collectionId={item.id}
                submitUrl={`/api/planned-cocktails/${item.id}/add-ingredients`}
                items={modalItems}
                onSuccess={(result) => {
                    toast.success(`${result.shopping} added to shopping - ${result.pantry} added to pantry`)
                    setShowAddModal(false)
                    onUpdate()
                }}
            />

            {confirmRemove && (
                <ConfirmDialog
                    title="Remove from planner?"
                    description={`"${item.cocktail?.name ?? 'This cocktail'}" will be removed from your plan.`}
                    confirmLabel="Remove"
                    onConfirm={() => { setConfirmRemove(false); void handleRemove() }}
                    onCancel={() => setConfirmRemove(false)}
                />
            )}
        </>
    )
}
