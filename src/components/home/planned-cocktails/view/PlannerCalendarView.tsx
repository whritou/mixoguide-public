'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    CalendarDays,
    CheckCheck,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Plus,
    RotateCcw,
    ShoppingCart,
    Sparkles,
    Trash2,
} from 'lucide-react'

import RescheduleDialog from '@/components/home/planned-cocktails/dialog/RescheduleDialog'
import RescheduleCollectionDialog from '@/components/home/planned-cocktails/dialog/RescheduleCollectionDialog'
import AddIngredientsModal, { type GroceryItem } from '@/components/AddIngredientsModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { usePlannedCocktailMutations } from '@/hooks/mutations/use-planned-cocktail-mutations'
import { usePlannedCollectionMutations } from '@/hooks/mutations/use-planned-collection-mutations'
import { useCocktailMadeLogMutations } from '@/hooks/mutations/use-cocktail-made-log-mutations'
import type { PlannedCocktail } from '@/types/models/planned-cocktail'
import type { PlannedCollection } from '@/types/models/planned-collection'
import type { CocktailMadeLog } from '@/types/models/cocktail-made-log'
import type { IngredientStatusInfo } from '@/hooks/useCocktailIngredientPantry'
import { convertUnit } from '@/utils/unitConversion'
import { isBlockingCocktailIngredient } from '@/utils/cocktailIngredientImportance'
import {
    type CalendarMode,
    startOfDay,
    isSameDay,
    addDays,
    addMonths,
    dayKey,
    parseIso,
    buildMonthGrid,
    buildWeekGrid,
    formatCalendarHeader,
} from '@/utils/calendarDates'

type Mode = CalendarMode

type CalendarEvent =
    | { kind: 'planned'; date: Date; id: string; title: string; item: PlannedCocktail; overdue: boolean; today: boolean }
    | { kind: 'collection'; date: Date; id: string; title: string; item: PlannedCollection; overdue: boolean; today: boolean }
    | { kind: 'made'; date: Date; id: string; title: string; item: CocktailMadeLog; overdue: false; today: boolean }

interface Props {
    now: Date
    plannedItems: PlannedCocktail[]
    collections: PlannedCollection[]
    madeLogs: CocktailMadeLog[]
    onUpdate: () => void
    onOpenCreateCollection: () => void
    onClickEmptyCell?: (dateStr: string) => void
    getIngredientStatus?: (id: string) => IngredientStatusInfo
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function PlannerCalendarView({
    now,
    plannedItems,
    collections,
    madeLogs,
    onUpdate,
    onOpenCreateCollection,
    onClickEmptyCell,
    getIngredientStatus,
}: Props) {
    const router = useRouter()
    const today = startOfDay(now)

    const [mode, setMode] = useState<Mode>('month')
    const [cursor, setCursor] = useState<Date>(today)
    const [dragId, setDragId] = useState<string | null>(null)
    const [dropTarget, setDropTarget] = useState<string | null>(null)

    const [selected, setSelected] = useState<CalendarEvent | null>(null)
    const [reschedItem, setReschedItem] = useState<PlannedCocktail | null>(null)
    const [reschedCollectionItem, setReschedCollectionItem] = useState<PlannedCollection | null>(null)
    const [ingredientsItem, setIngredientsItem] = useState<PlannedCocktail | null>(null)
    const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null)


    const { update: updatePlanned, remove: removePlanned, complete: completePlanned } = usePlannedCocktailMutations()
    const { update: updateCollection, remove: removeCollection, complete: completeCollection } = usePlannedCollectionMutations()
    const { remove: removeMadeLog } = useCocktailMadeLogMutations()

    const days = useMemo(() => (mode === 'month' ? buildMonthGrid(cursor) : buildWeekGrid(cursor)), [mode, cursor])

    const eventsByDay = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>()
        const push = (e: CalendarEvent) => {
            const k = dayKey(e.date)
            const list = map.get(k) ?? []
            list.push(e)
            map.set(k, list)
        }

        for (const p of plannedItems) {
            const d = parseIso(p.plannedFor)
            const sd = startOfDay(d)
            const overdue = p.status === 'planned' && sd.getTime() < today.getTime()
            const isToday = isSameDay(sd, today)
            push({
                kind: 'planned',
                date: sd,
                id: p.id,
                title: p.cocktail?.name ?? 'Cocktail',
                item: p,
                overdue,
                today: isToday,
            })
        }

        for (const c of collections) {
            const d = parseIso(c.plannedFor)
            const sd = startOfDay(d)
            const overdue = c.status === 'planned' && sd.getTime() < today.getTime()
            const isToday = isSameDay(sd, today)
            push({
                kind: 'collection',
                date: sd,
                id: c.id,
                title: c.title,
                item: c,
                overdue,
                today: isToday,
            })
        }

        for (const m of madeLogs) {
            const d = parseIso(m.madeAt)
            const sd = startOfDay(d)
            push({
                kind: 'made',
                date: sd,
                id: m.id,
                title: m.cocktail?.name ?? 'Made',
                item: m,
                overdue: false,
                today: isSameDay(sd, today),
            })
        }

        for (const [k, list] of map) {
            list.sort((a, b) => {
                const order = { planned: 0, collection: 1, made: 2 } as const
                return order[a.kind] - order[b.kind]
            })
            map.set(k, list)
        }
        return map
    }, [plannedItems, collections, madeLogs, today])

    function shiftCursor(delta: number) {
        if (mode === 'month') setCursor((c) => addMonths(c, delta))
        else setCursor((c) => addDays(c, delta * 7))
    }

    function findEvent(id: string): CalendarEvent | undefined {
        for (const list of eventsByDay.values()) {
            const ev = list.find((e) => e.id === id)
            if (ev) return ev
        }
        return undefined
    }

    async function handleDrop(targetKey: string, draggedId: string) {
        setDropTarget(null)
        setDragId(null)
        const ev = findEvent(draggedId)
        if (!ev) return

        const [y, m, d] = targetKey.split('-').map(Number)
        const target = new Date(y, m - 1, d, 12, 0, 0)
        if (isSameDay(target, ev.date)) return

        if (ev.kind === 'made') {
            toast.info('Made logs cannot be moved')
            return
        }

        try {
            if (ev.kind === 'planned') {
                await updatePlanned.mutateAsync({ id: ev.id, data: { plannedFor: target.toISOString() } })
                toast.success(`${ev.title} moved`)
            } else {
                await updateCollection.mutateAsync({ id: ev.id, data: { plannedFor: target.toISOString() } })
                toast.success(`${ev.title} moved`)
            }
            onUpdate()
        } catch {
            toast.error('Could not reschedule')
        }
    }

    async function markPlannedDone(p: PlannedCocktail) {
        try {
            await completePlanned.mutateAsync({ id: p.id, cocktailId: p.cocktailId })
            toast.success(`${p.cocktail?.name ?? 'Cocktail'} done`)
            setSelected(null)
            onUpdate()
        } catch {
            toast.error('Could not mark as done')
        }
    }

    async function undoPlannedDone(p: PlannedCocktail) {
        try {
            await updatePlanned.mutateAsync({ id: p.id, data: { status: 'planned' } })
            toast.success('Moved back to planned')
            setSelected(null)
            onUpdate()
        } catch {
            toast.error('Could not update status')
        }
    }

    async function deletePlanned(p: PlannedCocktail) {
        try {
            await removePlanned.mutateAsync(p.id)
            toast.success('Removed from plan')
            setSelected(null)
            onUpdate()
        } catch {
            toast.error('Could not delete')
        }
    }

    async function deleteCollection(c: PlannedCollection) {
        try {
            await removeCollection.mutateAsync(c.id)
            toast.success('Collection removed')
            setSelected(null)
            onUpdate()
        } catch {
            toast.error('Could not delete')
        }
    }

    async function deleteMade(m: CocktailMadeLog) {
        try {
            await removeMadeLog.mutateAsync(m.id)
            toast.success('Removed from history')
            setSelected(null)
            onUpdate()
        } catch {
            toast.error('Could not delete')
        }
    }

    async function markCollectionDone(c: PlannedCollection) {
        try {
            await completeCollection.mutateAsync(c.id)
            toast.success(`"${c.title}" marked as done`)
            setSelected(null)
            onUpdate()
        } catch {
            toast.error('Could not mark as done')
        }
    }

    function stockSummary(p: PlannedCocktail): { ok: number; total: number } | null {
        if (!getIngredientStatus) return null
        const required = (p.cocktail?.ingredients ?? []).filter(isBlockingCocktailIngredient)
        if (!required.length) return null
        const ok = required.filter((i) => {
            const s = getIngredientStatus(i.ingredientId)
            return s.inPantry && s.stockLevel !== 'out'
        }).length
        return { ok, total: required.length }
    }

    function ingredientsForPlanned(p: PlannedCocktail): GroceryItem[] {
        const ingredients = (p.cocktail?.ingredients ?? []).filter(isBlockingCocktailIngredient)
        return ingredients.map((ingredient) => {
            const status = getIngredientStatus?.(ingredient.ingredientId)
            const totalNeeded = ingredient.amount ? ingredient.amount * p.quantity : 1
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
                if (converted != null) inPantry = converted
                else if (status.pantryUnit === neededUnit) inPantry = status.pantryAmount
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
    }

    const isMonth = mode === 'month'
    const eventStatusLabel = (e: CalendarEvent) => {
        if (e.kind === 'made') return 'Made'
        if (e.item.status === 'done') return e.kind === 'collection' ? 'Event, done' : 'Done'
        const prefix = e.kind === 'collection' ? 'Event' : 'Planned'
        if (e.overdue) return `${prefix}, overdue`
        if (e.today) return `${prefix}, today`
        return prefix
    }
    const eventChipStyle = (e: CalendarEvent) => {
        if (e.kind === 'made') return 'bg-surface-inverse/85 text-fg-on-inverse inset-ring-1 inset-ring-fg/40'
        if (e.kind === 'collection') {
            if (e.item.status === 'done') return 'bg-surface-inverse/85 text-fg-on-inverse inset-ring-1 inset-ring-fg/40'
            return e.overdue ? 'bg-danger-bg text-danger' : 'bg-brand/15 text-brand'
        }
        if (e.item.status === 'done') return 'bg-surface-inverse/85 text-fg-on-inverse inset-ring-1 inset-ring-fg/40'
        if (e.overdue) return 'bg-danger-bg text-danger'
        if (e.today) return 'bg-brand text-fg-on-brand'
        return 'bg-surface border border-line-strong text-fg-secondary'
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 rounded-2xl border border-line bg-surface p-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCursor(today)}
                        className="px-3 py-1.5 text-xs font-label uppercase tracking-widest rounded-full bg-line text-fg-secondary hover:bg-line-strong transition-colors"
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={() => shiftCursor(-1)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-line-strong bg-surface text-fg-secondary hover:bg-canvas-hover"
                        aria-label={mode === 'month' ? 'Previous month' : 'Previous week'}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => shiftCursor(1)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-line-strong bg-surface text-fg-secondary hover:bg-canvas-hover"
                        aria-label={mode === 'month' ? 'Next month' : 'Next week'}
                    >
                        <ChevronRight size={14} />
                    </button>
                    <h3 className="ml-2 font-headline text-lg md:text-xl text-fg" aria-live="polite">{formatCalendarHeader(cursor, mode)}</h3>
                </div>

                <div className="flex items-center gap-2">
                    <div
                        role="group"
                        aria-label="Calendar view"
                        className="flex rounded-full bg-line p-1 gap-1"
                        title="Drag events to reschedule"
                    >
                        {(['month', 'week'] as const).map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMode(m)}
                                aria-pressed={mode === m}
                                className={`px-4 py-1.5 text-xs font-label uppercase tracking-widest rounded-full transition-all ${mode === m ? 'bg-surface shadow-sm text-brand font-bold' : 'text-fg-muted hover:text-fg-secondary'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push('/cocktails')}
                        className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line-strong bg-surface text-fg-secondary text-xs font-label uppercase tracking-widest hover:bg-canvas-hover"
                    >
                        <Plus size={13} />
                        <span>Browse cocktails</span>
                    </button>
                    <button
                        type="button"
                        onClick={onOpenCreateCollection}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand text-xs font-label uppercase tracking-widest hover:opacity-80"
                    >
                        <Sparkles size={13} />
                        <span className="inline">New event</span>
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="rounded-2xl border border-line bg-surface overflow-hidden">
                <div className={`${isMonth ? 'grid grid-cols-7' : 'hidden md:grid md:grid-cols-7'} bg-canvas border-b border-line`}>
                    {WEEKDAYS.map((w) => (
                        <div key={w} className="py-2 text-center text-[10px] font-label uppercase tracking-widest text-fg-muted">
                            {w}
                        </div>
                    ))}
                </div>

                <div className={`${isMonth ? 'grid grid-cols-7 auto-rows-fr' : 'flex flex-col md:grid md:grid-cols-7'}`}>
                    {days.map((day) => {
                        const k = dayKey(day)
                        const inMonth = day.getMonth() === cursor.getMonth()
                        const isToday = isSameDay(day, today)
                        const events = eventsByDay.get(k) ?? []
                        const isDropTarget = dropTarget === k

                        return (
                            <div
                                key={k}
                                onDragOver={(e) => {
                                    if (!dragId) return
                                    e.preventDefault()
                                    if (dropTarget !== k) setDropTarget(k)
                                }}
                                onDragLeave={() => {
                                    if (dropTarget === k) setDropTarget(null)
                                }}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    const id = e.dataTransfer.getData('text/plain') || dragId
                                    if (id) void handleDrop(k, id)
                                }}
                                onClick={() => {
                                    if (!dragId && events.length === 0 && onClickEmptyCell) {
                                        onClickEmptyCell(k)
                                    }
                                }}
                                className={`relative p-1.5 transition-colors ${isMonth ? 'border-r border-b last:border-r-0' : 'border-b md:border-r md:last:border-r-0'} ${isMonth ? 'min-h-[70px] sm:min-h-[110px]' : 'md:min-h-[400px]'} ${inMonth ? 'bg-surface' : 'bg-canvas/60'} ${isDropTarget ? 'bg-brand-soft/15 border-brand-soft ring-1 ring-ring ring-inset' : dragId ? 'border-dashed border-line-strong/80' : 'border-line'} ${!dragId && events.length === 0 && onClickEmptyCell ? 'cursor-pointer hover:bg-brand-soft/5' : ''}`}
                            >
                                {/* Day number — always in month mode; desktop-only in week mode */}
                                <div className={`flex items-center justify-between mb-1 ${!isMonth ? 'hidden md:flex' : ''}`}>
                                    <span className={`inline-flex items-center justify-center text-xs font-medium ${isToday ? 'h-6 w-6 rounded-full bg-brand text-fg-on-brand' : inMonth ? 'text-fg' : 'text-fg-muted'}`}>
                                        {day.getDate()}
                                    </span>
                                    {events.length > 3 && isMonth && (
                                        <span className="text-[10px] text-fg-muted">{events.length}</span>
                                    )}
                                </div>

                                {/* Mobile-only week label: "Mon 5" — replaces the hidden header row */}
                                {!isMonth && (
                                    <div className="flex md:hidden items-center gap-2 mb-2">
                                        <span className="text-xs font-label uppercase tracking-widest text-fg-muted">
                                            {WEEKDAYS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                                        </span>
                                        <span className={`inline-flex items-center justify-center text-sm font-medium ${isToday ? 'h-6 w-6 rounded-full bg-brand text-fg-on-brand' : 'text-fg'}`}>
                                            {day.getDate()}
                                        </span>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    {(isMonth ? events.slice(0, 3) : events).map((ev) => {
                                        const isDone =
                                            (ev.kind === 'planned' && ev.item.status === 'done') ||
                                            (ev.kind === 'collection' && ev.item.status === 'done') ||
                                            ev.kind === 'made'
                                        const draggable = ev.kind !== 'made'
                                        const stock = ev.kind === 'planned' ? stockSummary(ev.item) : null

                                        if (!isMonth) {
                                            return (
                                                <button
                                                    key={`${ev.kind}-${ev.id}`}
                                                    type="button"
                                                    draggable={draggable}
                                                    onDragStart={(e) => {
                                                        setDragId(ev.id)
                                                        e.dataTransfer.setData('text/plain', ev.id)
                                                        e.dataTransfer.effectAllowed = 'move'
                                                    }}
                                                    onDragEnd={() => { setDragId(null); setDropTarget(null) }}
                                                    onClick={(e) => { e.stopPropagation(); setSelected(ev) }}
                                                    className={`w-full text-left rounded-xl px-3 py-2.5 transition-all hover:opacity-90 ${eventChipStyle(ev)} ${dragId === ev.id ? 'opacity-50' : ''}`}
                                                    title={ev.title}
                                                >
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <span className="sr-only">{eventStatusLabel(ev)}: </span>
                                                        {ev.kind === 'collection' && <Sparkles size={11} />}
                                                        {ev.kind === 'made' && <CheckCheck size={11} />}
                                                        <span className={`text-sm font-semibold leading-tight line-clamp-2 ${isDone && ev.kind === 'planned' ? 'line-through opacity-75' : ''}`}>
                                                            {ev.title}
                                                        </span>
                                                    </div>
                                                    {ev.kind === 'planned' && (
                                                        <div className="text-xs opacity-80 flex items-center gap-2">
                                                            <span>{ev.item.quantity} serving{ev.item.quantity > 1 ? 's' : ''}</span>
                                                            {stock && (
                                                                <span className={stock.ok === stock.total ? 'opacity-70' : 'font-medium'}>
                                                                    · {stock.ok}/{stock.total} in stock
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {ev.kind === 'collection' && (
                                                        <div className="text-xs opacity-80">
                                                            {ev.item.cocktails?.length ?? 0} cocktail{(ev.item.cocktails?.length ?? 0) !== 1 ? 's' : ''}
                                                        </div>
                                                    )}
                                                    {ev.kind === 'made' && (
                                                        <div className="text-xs opacity-80">{ev.item.quantity} made</div>
                                                    )}
                                                </button>
                                            )
                                        }

                                        return (
                                            <button
                                                key={`${ev.kind}-${ev.id}`}
                                                type="button"
                                                draggable={draggable}
                                                onDragStart={(e) => {
                                                    setDragId(ev.id)
                                                    e.dataTransfer.setData('text/plain', ev.id)
                                                    e.dataTransfer.effectAllowed = 'move'
                                                }}
                                                onDragEnd={() => {
                                                    setDragId(null)
                                                    setDropTarget(null)
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelected(ev)
                                                }}
                                                className={`relative w-full text-left truncate px-1.5 py-0.5 rounded-md text-xs font-medium transition-all hover:opacity-90 ${eventChipStyle(ev)} ${dragId === ev.id ? 'opacity-50' : ''}`}
                                                title={ev.title}
                                            >
                                                <span className="inline-flex items-center gap-1 w-full">
                                                    <span className="sr-only">{eventStatusLabel(ev)}: </span>
                                                    {ev.kind === 'collection' && <Sparkles size={9} />}
                                                    {ev.kind === 'made' && <CheckCheck size={9} />}
                                                    <span className={`truncate ${isDone && ev.kind === 'planned' ? 'line-through opacity-90' : ''}`}>
                                                        {ev.title}
                                                    </span>
                                                    {stock && stock.ok < stock.total && (
                                                        <span className="ml-auto shrink-0 text-[10px] opacity-75">{stock.ok}/{stock.total}</span>
                                                    )}
                                                </span>
                                            </button>
                                        )
                                    })}
                                    {isMonth && events.length > 3 && (
                                        <button
                                            type="button"
                                            onClick={() => { setMode('week'); setCursor(day) }}
                                            className="min-h-6 text-[10px] text-brand hover:underline px-1 text-left"
                                        >
                                            +{events.length - 3} more
                                            <span className="sr-only"> events, show week</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted" aria-label="Calendar legend" role="note">
                <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-3 w-3 rounded bg-surface border border-line-strong" /> Planned
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-3 w-3 rounded bg-brand" /> Today
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-3 w-3 rounded bg-danger-bg border border-danger/30" /> Overdue
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-3 w-3 rounded bg-brand/15 border border-brand/30" /> Collection
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-3 w-3 rounded bg-surface-inverse/85 inset-ring-1 inset-ring-fg/40" /> Done / Made
                </span>
            </div>

            {/* Selected event popover */}
            {selected && (
                <Dialog open onOpenChange={(o) => { if (!o) setSelected(null) }}>
                    <DialogContent
                        showCloseButton={false}
                        aria-describedby={undefined}
                        overlayClassName="z-[160] backdrop-blur-sm"
                        className="z-[160] w-full max-w-md sm:max-w-md bg-canvas rounded-2xl shadow-2xl flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-y-auto p-0 border-0"
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                            <div className="flex items-center gap-2 min-w-0">
                                {selected.kind === 'collection' ? (
                                    <Sparkles size={16} className="text-brand-soft-strong shrink-0" />
                                ) : selected.kind === 'made' ? (
                                    <CheckCheck size={16} className="text-brand shrink-0" />
                                ) : (
                                    <CalendarDays size={16} className="text-brand-soft-strong shrink-0" />
                                )}
                                <DialogTitle className="font-headline text-lg font-normal leading-normal text-fg truncate">{selected.title}</DialogTitle>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="min-h-8 text-fg-muted text-xs px-2 py-1 rounded hover:bg-line hover:text-fg"
                            >
                                Close
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-2 text-sm text-fg-secondary">
                            <p className="flex items-center gap-2 text-xs text-fg-muted">
                                <CalendarDays size={12} />
                                {selected.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            {selected.kind === 'planned' && (() => {
                                const stock = stockSummary(selected.item as PlannedCocktail)
                                return (
                                    <>
                                        <p className="text-xs text-fg-muted">
                                            {selected.item.quantity} serving{selected.item.quantity > 1 ? 's' : ''} ·{' '}
                                            {selected.item.status === 'done' ? 'Completed' : selected.overdue ? 'Overdue' : 'Planned'}
                                        </p>
                                        {stock && (
                                            <p className={`text-xs font-medium ${stock.ok === stock.total ? 'text-brand' : stock.ok === 0 ? 'text-danger' : 'text-brand-soft-strong'}`}>
                                                {stock.ok}/{stock.total} ingredients in stock
                                            </p>
                                        )}
                                    </>
                                )
                            })()}
                            {selected.kind === 'collection' && (
                                <p className="text-xs text-fg-muted">
                                    {selected.item.cocktails?.length ?? 0} cocktail
                                    {(selected.item.cocktails?.length ?? 0) === 1 ? '' : 's'} ·{' '}
                                    {selected.item.status === 'done' ? 'Completed' : selected.overdue ? 'Overdue' : 'Planned'}
                                </p>
                            )}
                            {selected.kind === 'made' && (
                                <p className="text-xs text-fg-muted">{selected.item.quantity} made</p>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-line flex flex-wrap gap-2">
                            {selected.kind === 'planned' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            router.push(`/cocktails/${selected.item.cocktailId}`)
                                            setSelected(null)
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line-strong bg-surface text-xs font-label uppercase tracking-widest text-fg-secondary hover:bg-canvas-hover"
                                    >
                                        <ExternalLink size={12} />
                                        Open
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReschedItem(selected.item as PlannedCocktail)
                                            setSelected(null)
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line-strong bg-surface text-xs font-label uppercase tracking-widest text-fg-secondary hover:bg-canvas-hover"
                                    >
                                        <CalendarDays size={12} />
                                        Edit
                                    </button>
                                    {(selected.item as PlannedCocktail).cocktail?.ingredients?.length ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIngredientsItem(selected.item as PlannedCocktail)
                                                setSelected(null)
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line-strong bg-surface text-xs font-label uppercase tracking-widest text-fg-secondary hover:bg-canvas-hover"
                                        >
                                            <ShoppingCart size={12} />
                                            Manage
                                        </button>
                                    ) : null}
                                    {(selected.item as PlannedCocktail).status === 'planned' ? (
                                        <button
                                            type="button"
                                            onClick={() => void markPlannedDone(selected.item as PlannedCocktail)}
                                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand text-fg-on-brand text-xs font-label uppercase tracking-widest hover:bg-brand/80"
                                        >
                                            <CheckCheck size={12} />
                                            Done
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => void undoPlannedDone(selected.item as PlannedCocktail)}
                                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-line text-fg-secondary text-xs font-label uppercase tracking-widest hover:bg-line-strong"
                                        >
                                            <RotateCcw size={12} />
                                            Undo
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setPendingDelete(selected); setSelected(null) }}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-line-strong bg-surface text-danger hover:bg-danger-bg"
                                        aria-label="Delete"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </>
                            )}
                            {selected.kind === 'collection' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            router.push('/planner?view=collections')
                                            setSelected(null)
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line-strong bg-surface text-xs font-label uppercase tracking-widest text-fg-secondary hover:bg-canvas-hover"
                                    >
                                        <ExternalLink size={12} />
                                        Open
                                    </button>
                                    {(selected.item as PlannedCollection).status === 'planned' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setReschedCollectionItem(selected.item as PlannedCollection)
                                                setSelected(null)
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line-strong bg-surface text-xs font-label uppercase tracking-widest text-fg-secondary hover:bg-canvas-hover"
                                        >
                                            <CalendarDays size={12} />
                                            Reschedule
                                        </button>
                                    )}
                                    {(selected.item as PlannedCollection).status === 'planned' ? (
                                        <button
                                            type="button"
                                            onClick={() => void markCollectionDone(selected.item as PlannedCollection)}
                                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand text-fg-on-brand text-xs font-label uppercase tracking-widest hover:bg-brand/80"
                                        >
                                            <CheckCheck size={12} />
                                            Done
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await updateCollection.mutateAsync({ id: selected.item.id, data: { status: 'planned' } })
                                                    toast.success('Moved back to planned')
                                                    setSelected(null)
                                                    onUpdate()
                                                } catch {
                                                    toast.error('Could not update status')
                                                }
                                            }}
                                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-line text-fg-secondary text-xs font-label uppercase tracking-widest hover:bg-line-strong"
                                        >
                                            <RotateCcw size={12} />
                                            Undo
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setPendingDelete(selected); setSelected(null) }}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-line-strong bg-surface text-danger hover:bg-danger-bg"
                                        aria-label="Delete collection"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </>
                            )}
                            {selected.kind === 'made' && (
                                <>
                                    {!(selected.item as CocktailMadeLog).isArchivedCocktail && selected.item.cocktailId ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                router.push(`/cocktails/${selected.item.cocktailId}`)
                                                setSelected(null)
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line-strong bg-surface text-xs font-label uppercase tracking-widest text-fg-secondary hover:bg-canvas-hover"
                                        >
                                            <ExternalLink size={12} />
                                            Open
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-line-strong bg-line text-xs font-label uppercase tracking-widest text-fg-muted">
                                            Archived
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setPendingDelete(selected); setSelected(null) }}
                                        className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-full border border-line-strong bg-surface text-danger hover:bg-danger-bg"
                                        aria-label="Delete log"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {reschedItem && (
                <RescheduleDialog
                    item={reschedItem}
                    open
                    onOpenChange={(o) => { if (!o) setReschedItem(null) }}
                    onRescheduled={() => { setReschedItem(null); onUpdate() }}
                />
            )}

            {ingredientsItem && (
                <AddIngredientsModal
                    open
                    onClose={() => setIngredientsItem(null)}
                    collectionId={ingredientsItem.id}
                    submitUrl={`/api/planned-cocktails/${ingredientsItem.id}/add-ingredients`}
                    items={ingredientsForPlanned(ingredientsItem)}
                    onSuccess={(result) => {
                        toast.success(`${result.shopping} added to shopping - ${result.pantry} added to pantry`)
                        setIngredientsItem(null)
                        onUpdate()
                    }}
                />
            )}

            {reschedCollectionItem && (
                <RescheduleCollectionDialog
                    item={reschedCollectionItem}
                    onRescheduled={() => { setReschedCollectionItem(null); onUpdate() }}
                    onClose={() => setReschedCollectionItem(null)}
                />
            )}

            {pendingDelete && (
                <ConfirmDialog
                    title={
                        pendingDelete.kind === 'planned'
                            ? 'Remove from planner?'
                            : pendingDelete.kind === 'collection'
                                ? `Delete "${pendingDelete.title}"?`
                                : 'Remove from history?'
                    }
                    description={
                        pendingDelete.kind === 'planned'
                            ? `"${pendingDelete.title}" will be removed from your plan.`
                            : pendingDelete.kind === 'collection'
                                ? 'This event will be permanently removed.'
                                : `"${pendingDelete.title}" will be removed from your made log.`
                    }
                    confirmLabel={pendingDelete.kind === 'collection' ? 'Delete' : 'Remove'}
                    onConfirm={() => {
                        const ev = pendingDelete
                        setPendingDelete(null)
                        if (ev.kind === 'planned') void deletePlanned(ev.item as PlannedCocktail)
                        else if (ev.kind === 'collection') void deleteCollection(ev.item as PlannedCollection)
                        else void deleteMade(ev.item as CocktailMadeLog)
                    }}
                    onCancel={() => setPendingDelete(null)}
                />
            )}
        </div>
    )
}
