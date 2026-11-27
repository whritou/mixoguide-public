'use client'

import { useReducer, type ComponentType, type KeyboardEvent, type MouseEvent } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import {
    CheckCheck, Trash2, RotateCcw, CalendarDays,
    Users, UserCheck, Tag, Link2, FlaskConical, AlertTriangle, ShoppingCart, ChevronRight,
} from 'lucide-react'
import CollectionDetailsModal from './CollectionDetailsModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePlannedCollectionMutations } from '@/hooks/mutations/use-planned-collection-mutations'
import { useGroceryList } from '@/hooks/queries/use-planned-collections'
import { useQueryClient } from '@tanstack/react-query'
import { invalidators } from '@/lib/invalidation'
import type { PlannedCollection } from '@/types/models/planned-collection'
import AddIngredientsModal from '@/components/AddIngredientsModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getCollectionGroceryStatusCounts } from '@/components/home/planned-cocktails/card/CollectionGrocerySection'
import { isOverdueDate, parseIsoDate } from '@/lib/planner-dashboard/plannerDateUtils'
import ShareCollectionModal from './ShareCollectionModal'

interface Props {
    item:     PlannedCollection
    now:      Date
    onUpdate: () => void
}

const formatLabel = (value: string) =>
    value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())

type CardState = {
    completing:    boolean
    completingCocktailId: string | null
    showAddModal:  boolean
    confirmRemove: boolean
    confirmDone:   boolean
    confirmCocktailDone: { cocktailId: string; name: string } | null
    showShare:     boolean
    showDetails:   boolean
    shareToken:    string | null
}

type CardAction =
    | { type: 'TOGGLE'; key: 'showAddModal' | 'showShare' | 'showDetails' }
    | { type: 'SET'; key: keyof CardState; value: CardState[keyof CardState] }

function cardReducer(state: CardState, action: CardAction): CardState {
    if (action.type === 'TOGGLE') return { ...state, [action.key]: !state[action.key] }
    return { ...state, [action.key]: action.value }
}

export default function PlannedCollectionCard({ item, now, onUpdate }: Props) {
    const { create: createCollection, update, remove: removeCollection, complete, completeCocktail } = usePlannedCollectionMutations()
    const qc = useQueryClient()

    const [state, dispatch] = useReducer(cardReducer, {
        completing:    false,
        completingCocktailId: null,
        showAddModal:  false,
        confirmRemove: false,
        confirmDone:   false,
        confirmCocktailDone: null,
        showShare:     false,
        showDetails:   false,
        shareToken:    item.shareToken ?? null,
    })
    const {
        completing,
        completingCocktailId,
        showAddModal,
        confirmRemove,
        confirmDone,
        confirmCocktailDone,
        showShare,
        showDetails,
        shareToken,
    } = state

    const isDone   = item.status === 'done'
    const planned  = parseIsoDate(item.plannedFor)
    const isPast   = isOverdueDate(planned, now)

    // Auto-fetch grocery data for active collections so the "missing" count and
    // PDF download stay visible without the user expanding the section first.
    const groceryQuery   = useGroceryList(item.id, { enabled: !isDone && item.cocktails.length > 0 })
    const groceryItems   = groceryQuery.data ?? []
    const groceryLoading = groceryQuery.isFetching

    const formattedDate = planned.toLocaleDateString('en-US', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
    const showPlannedTime = planned.getHours() !== 12 || planned.getMinutes() !== 0
    const formattedTime = planned.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    })

    const completedDate = item.completedAt
        ? new Date(item.completedAt).toLocaleDateString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric',
        })
        : null

    /* ── Grocery list ────────────────────────────────────── */

    const loadGrocery = async () => {
        try {
            const result = await groceryQuery.refetch()
            if (result.error) throw result.error
        } catch {
            toast.error('Could not load grocery list')
        }
    }

    const handleModalSuccess = (result: { shopping: number; pantry: number }) => {
        toast.success(
            `${result.shopping} added to shopping • ${result.pantry} added to pantry`
        )

        invalidators.plannedCollectionGrocery(qc, item.id)
        void loadGrocery()
        invalidators.plannedCocktails(qc)
        onUpdate()
    }

    /* ── Complete ────────────────────────────────────────── */

    const markDone = async () => {
        dispatch({ type: 'SET', key: 'completing', value: true })
        try {
            await complete.mutateAsync(item.id)
            toast.success(`"${item.title}" marked as done — pantry updated`)
            onUpdate()
        } catch {
            toast.error('Could not mark as done')
        } finally {
            dispatch({ type: 'SET', key: 'completing', value: false })
        }
    }

    const markCocktailDone = async (cocktailId: string, name: string) => {
        dispatch({ type: 'SET', key: 'completingCocktailId', value: cocktailId })
        try {
            await completeCocktail.mutateAsync({ id: item.id, cocktailId })
            toast.success(`"${name}" marked as made - pantry updated`)
            invalidators.plannedCollectionGrocery(qc, item.id)
            void loadGrocery()
            onUpdate()
        } catch {
            toast.error('Could not mark cocktail as made')
        } finally {
            dispatch({ type: 'SET', key: 'completingCocktailId', value: null })
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

    const restoreDeletedCollection = async () => {
        try {
            await createCollection.mutateAsync({
                title:       item.title,
                location:    item.location,
                guestNote:   item.guestNote,
                plannedFor:  item.plannedFor,
                servings:    item.servings,
                occasions:   item.occasions,
                cocktailIds: item.cocktails.map((entry) => entry.cocktailId),
            })
            toast.success('Event restored')
            onUpdate()
        } catch {
            toast.error('Could not restore event')
        }
    }

    const remove = async () => {
        await removeCollection.mutateAsync(item.id)
        let undoing = false
        toast.success('Event removed', {
            duration: 5000,
            action: {
                label:   'Undo',
                onClick: () => {
                    if (undoing) return
                    undoing = true
                    void restoreDeletedCollection()
                },
            },
        })
        onUpdate()
    }

    /* ── UI ──────────────────────────────────────────────── */

    const statusCounts = getCollectionGroceryStatusCounts(groceryItems)

    const goingCount = item.shareEnabled ? (item.rsvpGoingCount ?? 0) : 0
    const allStocked = !isDone
        && groceryItems.length > 0
        && statusCounts.missing + statusCounts.partial + statusCounts.inList === 0

    const openIngredientManager = async () => {
        await loadGrocery()
        dispatch({ type: 'SET', key: 'showAddModal', value: true })
    }

    const openDetails = () => dispatch({ type: 'SET', key: 'showDetails', value: true })
    const isActionTarget = (target: EventTarget | null) =>
        target instanceof HTMLElement
        && Boolean(target.closest('button, a, input, textarea, select, label'))

    const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
        if (isActionTarget(e.target)) return
        openDetails()
    }

    const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openDetails()
        }
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            className="group bg-surface rounded-2xl overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-all duration-300 border border-line-strong/50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >

            {/* ───── Hero: thumbnails + corner actions ───── */}
            <div className="relative h-28 w-full bg-line overflow-hidden isolate">
                {item.cocktails.length > 0 ? (
                    <>
                        <div className={`absolute inset-0 z-0 flex ${isDone ? 'opacity-60' : ''}`}>
                            {item.cocktails.slice(0, 4).map((c, idx) => (
                                <div key={c.id} className="relative z-0 flex-1 overflow-hidden">
                                    <Image
                                        src={c.cocktail?.imageUrl ?? '/placeholder.svg'}
                                        alt={c.cocktail?.name ?? 'Cocktail'}
                                        fill
                                        className="object-cover"
                                        sizes="25vw"
                                    />
                                </div>
                            ))}
                        </div>
                        {item.cocktails.length > 4 && (
                            <div className="absolute bottom-2 left-3 z-10 text-[10px] font-label uppercase tracking-widest text-fg-on-image bg-overlay/73 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                +{item.cocktails.length - 4} more
                            </div>
                        )}
                        {/* Top fade so the corner pills stay readable on any image */}
                        <div className="absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-overlay/47 to-transparent pointer-events-none" />
                    </>
                ) : (
                    <div className="absolute inset-0 z-0 flex items-center justify-center bg-line/60">
                        <EmptyState icon={FlaskConical} heading="No cocktails yet" size="card" />
                    </div>
                )}

                {/* Done overlay */}
                {isDone && (
                    <div className="absolute inset-0 z-10 bg-overlay/53 flex items-center justify-center">
                        <span className="text-fg-on-image font-label text-xs uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCheck size={14} /> Done
                        </span>
                    </div>
                )}

                {/* Corner actions: Invite pill + Delete icon */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET', key: 'showShare', value: true }) }}
                        title={shareToken ? 'Manage invite link' : 'Invite guests'}
                        aria-label={shareToken ? 'Manage invite link' : 'Invite guests'}
                        className={`inline-flex h-7 items-center gap-1.5 px-2.5 rounded-full backdrop-blur-sm shadow-sm transition-all text-[10px] font-label uppercase tracking-widest
                            ${shareToken
                                ? 'bg-brand text-fg-on-brand hover:bg-brand/80'
                                : 'bg-surface/90 text-brand hover:bg-surface border border-line-strong'
                            }`}
                    >
                        <Link2 size={12} />
                        {shareToken ? 'Shared' : 'Invite'}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET', key: 'confirmRemove', value: true }) }}
                        title="Delete event"
                        aria-label="Delete event"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface/85 backdrop-blur-sm shadow-sm hover:bg-danger-bg text-fg-muted hover:text-danger transition-all"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* ───── Body ───── */}
            <div className="flex flex-col flex-1 p-5 gap-4">

                {/* Identity: title + status chip, then date */}
                <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-headline italic text-xl text-fg leading-tight line-clamp-2">
                            {item.title}
                        </h3>
                        {isDone ? (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-label uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                                <CheckCheck size={10} />
                                Done
                            </span>
                        ) : isPast ? (
                            <span className="shrink-0 text-[10px] font-label uppercase tracking-widest px-2 py-0.5 rounded-full bg-danger-bg text-danger">
                                Overdue
                            </span>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                        <CalendarDays size={12} />
                        <span>{showPlannedTime ? `${formattedDate} at ${formattedTime}` : formattedDate}</span>
                        {isDone && completedDate && (
                            <span className="text-brand ml-1">· done {completedDate}</span>
                        )}
                    </div>
                </div>

                {/* Stat band — cocktails / servings / going */}
                <div className="flex items-center divide-x divide-line-strong/60 border-y border-line-strong/60 py-2.5 -mx-1">
                    <StatCell icon={FlaskConical} value={item.cocktails.length} label="cocktails" />
                    <StatCell icon={Users}        value={item.servings}          label={item.servings === 1 ? 'serving' : 'servings'} />
                    {goingCount > 0 && (
                        <StatCell icon={UserCheck} value={goingCount} label="going" accent />
                    )}
                </div>

                {/* Occasions (max 2 visible + overflow) — kept compact */}
                {item.occasions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {item.occasions.slice(0, 2).map((occ) => (
                            <span
                                key={occ}
                                className="inline-flex items-center gap-1 text-[10px] font-label uppercase tracking-widest px-2 py-0.5 rounded-full bg-line text-fg-secondary"
                            >
                                <Tag size={8} />
                                {formatLabel(occ)}
                            </span>
                        ))}
                        {item.occasions.length > 2 && (
                            <span className="text-[10px] font-label uppercase tracking-widest px-2 py-0.5 rounded-full bg-line/60 text-fg-muted">
                                +{item.occasions.length - 2}
                            </span>
                        )}
                    </div>
                )}

                {/* Pantry status pill + "View details" affordance — single slim row */}
                {!isDone && item.cocktails.length > 0 && (
                    <div className="flex items-center justify-between gap-2 mt-auto">
                        {groceryLoading && groceryItems.length === 0 ? (
                            <span className="text-[10px] font-label uppercase tracking-widest text-fg-muted italic">
                                checking pantry…
                            </span>
                        ) : statusCounts.missing + statusCounts.partial > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-label uppercase tracking-widest text-danger bg-danger-bg rounded-full px-2 py-1">
                                <AlertTriangle size={11} />
                                {statusCounts.missing + statusCounts.partial} missing
                            </span>
                        ) : groceryItems.length > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-label uppercase tracking-widest text-brand bg-brand/10 rounded-full px-2 py-1">
                                <CheckCheck size={11} />
                                All stocked
                            </span>
                        ) : (
                            <span /> // spacer so "View details" stays right-aligned
                        )}

                        <span className="inline-flex items-center gap-0.5 text-[10px] font-label uppercase tracking-widest text-fg-muted group-hover:text-brand group-hover:underline underline-offset-4 transition-colors">
                            View details
                            <ChevronRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </div>
                )}

                {/* Primary actions */}
                <div className={`flex gap-2 ${!isDone && item.cocktails.length > 0 ? '' : 'mt-auto'} pt-1`}>
                    {!isDone && item.cocktails.length > 0 && !allStocked && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void openIngredientManager() }}
                            disabled={groceryLoading}
                            className="min-w-0 flex-1 overflow-hidden px-2 py-2.5 text-[9px] sm:text-[10px] 2xl:text-[11px] font-label uppercase tracking-[0.04em] rounded-full flex items-center justify-center gap-1 bg-line/60 text-fg-secondary hover:bg-brand-soft/20 hover:text-brand transition-colors disabled:opacity-40"
                        >
                            <ShoppingCart size={12} className="shrink-0" />
                            <span className="min-w-0 whitespace-nowrap text-center leading-none">Manage ingredients</span>
                        </button>
                    )}
                    {!isDone && allStocked && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void openIngredientManager() }}
                            disabled={groceryLoading}
                            className="min-w-0 flex-1 overflow-hidden px-2 py-2.5 text-[9px] sm:text-[10px] 2xl:text-[11px] font-label uppercase tracking-[0.04em] rounded-full flex items-center justify-center gap-1 bg-brand/10 text-brand hover:bg-brand/15 transition-colors"
                        >
                            <CheckCheck size={12} className="shrink-0" />
                            <span className="min-w-0 whitespace-nowrap text-center leading-none">All stocked</span>
                        </button>
                    )}

                    {!isDone ? (
                        <button
                            type="button"
                            onClick={async (e) => {
                                e.stopPropagation()
                                if (groceryItems.length === 0) {
                                    try { await groceryQuery.refetch() } catch { /* silently ignore */ }
                                }
                                dispatch({ type: 'SET', key: 'confirmDone', value: true })
                            }}
                            disabled={completing}
                            className="min-w-0 flex-1 overflow-hidden px-2 py-2.5 text-[9px] sm:text-[10px] 2xl:text-[11px] font-label uppercase tracking-[0.04em] rounded-full flex items-center justify-center gap-1 bg-brand text-fg-on-brand hover:bg-brand/80 transition-colors disabled:opacity-50"
                        >
                            <CheckCheck size={13} className="shrink-0" />
                            <span className="min-w-0 whitespace-nowrap text-center leading-none">Mark done</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void undoDone() }}
                            className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full flex items-center justify-center gap-1.5 bg-line/60 text-fg-secondary hover:bg-line transition-colors"
                        >
                            <RotateCcw size={13} /> Undo
                        </button>
                    )}
                </div>
            </div>
            <AddIngredientsModal
                open={showAddModal}
                onClose={() => dispatch({ type: 'SET', key: 'showAddModal', value: false })}
                collectionId={item.id}
                items={groceryItems}
                onSuccess={handleModalSuccess}
            />
            {confirmRemove && (
                <ConfirmDialog
                    title={`Delete "${item.title}"?`}
                    description="This event will be permanently removed."
                    confirmLabel="Delete"
                    onConfirm={() => { dispatch({ type: 'SET', key: 'confirmRemove', value: false }); void remove() }}
                    onCancel={() => dispatch({ type: 'SET', key: 'confirmRemove', value: false })}
                />
            )}
            {confirmDone && (
                <ConfirmDialog
                    title={`Mark "${item.title}" as done?`}
                    description="Ingredients will be deducted from your pantry."
                    detail={(() => {
                        const deducted = groceryItems.filter(i => i.inPantry > 0)
                        if (deducted.length === 0) return null
                        return (
                            <div className="rounded-xl bg-line/60 px-3 py-2.5 space-y-1">
                                <p className="text-[10px] font-label uppercase tracking-widest text-fg-muted mb-1.5">
                                    Deducted from pantry
                                </p>
                                {deducted.map(gi => (
                                    <p key={gi.ingredientId} className="text-xs text-fg-secondary">
                                        <span className="font-medium">{Math.min(gi.totalNeeded, gi.inPantry)} {gi.unit}</span>
                                        {' — '}{gi.ingredientName}
                                    </p>
                                ))}
                            </div>
                        )
                    })()}
                    confirmLabel="Mark done"
                    dangerous={false}
                    onConfirm={() => { dispatch({ type: 'SET', key: 'confirmDone', value: false }); void markDone() }}
                    onCancel={() => dispatch({ type: 'SET', key: 'confirmDone', value: false })}
                />
            )}
            {confirmCocktailDone && (
                <ConfirmDialog
                    title={`Mark "${confirmCocktailDone.name}" as made?`}
                    description="Ingredients for this cocktail will be deducted from your pantry."
                    confirmLabel="Mark made"
                    dangerous={false}
                    onConfirm={() => {
                        const pending = confirmCocktailDone
                        dispatch({ type: 'SET', key: 'confirmCocktailDone', value: null })
                        void markCocktailDone(pending.cocktailId, pending.name)
                    }}
                    onCancel={() => dispatch({ type: 'SET', key: 'confirmCocktailDone', value: null })}
                />
            )}
            {showShare && (
                <ShareCollectionModal
                    collectionId={item.id}
                    collectionTitle={item.title}
                    shareToken={shareToken}
                    onTokenChange={(t) => dispatch({ type: 'SET', key: 'shareToken', value: t })}
                    onClose={() => dispatch({ type: 'SET', key: 'showShare', value: false })}
                />
            )}
            {showDetails && (
                <CollectionDetailsModal
                    item={item}
                    groceryItems={groceryItems}
                    groceryLoading={groceryLoading}
                    statusCounts={statusCounts}
                    onManageIngredients={openIngredientManager}
                    onCollectionUpdated={onUpdate}
                    onMarkCocktailDone={(cocktailId, name) => dispatch({
                        type:  'SET',
                        key:   'confirmCocktailDone',
                        value: { cocktailId, name },
                    })}
                    completingCocktailId={completingCocktailId}
                    onClose={() => dispatch({ type: 'SET', key: 'showDetails', value: false })}
                />
            )}
        </div>
    )
}

/** A single cell in the stat band — icon above value above label. */
function StatCell({ icon: Icon, value, label, accent = false }: {
    icon:   ComponentType<{ size?: number; className?: string }>
    value:  number
    label:  string
    accent?: boolean
}) {
    return (
        <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
            <Icon size={13} className={accent ? 'text-brand' : 'text-fg-muted'} />
            <span className={`text-base font-headline ${accent ? 'text-brand' : 'text-fg'} leading-none mt-1`}>
                {value}
            </span>
            <span className="text-[9px] font-label uppercase tracking-widest text-fg-muted">
                {label}
            </span>
        </div>
    )
}

