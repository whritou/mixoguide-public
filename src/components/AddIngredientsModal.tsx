'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Check, ShoppingCart, Package } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'

export type GroceryItem = {
    ingredientId:   string
    ingredientName: string
    totalNeeded:    number
    unit:           string
    inPantry:       number
    missing:        number
    inWishlist:     boolean
}

type Status = 'in-stock' | 'in-list' | 'partial' | 'missing'

function statusOf(g: GroceryItem): Status {
    if (g.missing === 0)                            return 'in-stock'
    if (g.inWishlist)                               return 'in-list'
    if (g.inPantry > 0)                             return 'partial'
    return 'missing'
}

const STATUS_META: Record<Status, { label: string; pill: string; dot: string }> = {
    'in-stock': { label: 'In stock',  pill: 'bg-brand/10 text-brand',  dot: 'bg-brand' },
    'in-list':  { label: 'In shopping list',   pill: 'bg-brand-soft/20 text-brand',  dot: 'bg-brand-soft' },
    'partial':  { label: 'Partial',   pill: 'bg-warning-bg text-warning',      dot: 'bg-status-partial-dot' },
    'missing':  { label: 'Missing',   pill: 'bg-danger-bg/80 text-danger',  dot: 'bg-danger' },
}

interface IngredientRow extends GroceryItem {
    selected:    boolean
    destination: 'shopping' | 'pantry'
    quantity:    number
}

interface Props {
    open:         boolean
    onClose:      () => void
    collectionId: string
    submitUrl?:   string
    items:        GroceryItem[]
    onSuccess:    (result: { shopping: number; pantry: number }) => void
}

function buildRows(items: GroceryItem[]): IngredientRow[] {
    return items.map(g => ({
        ...g,
        selected:    g.missing > 0,
        destination: 'shopping' as const,
        quantity:    g.missing,
    }))
}

export default function AddIngredientsModal({ open, onClose, collectionId, submitUrl, items, onSuccess }: Props) {
    const [rows, setRows]           = useState<IngredientRow[]>(() => buildRows(items))
    const [submitting, setSubmitting] = useState(false)
    const prevOpen = useRef(false)

    // Reset rows whenever the modal opens
    useEffect(() => {
        if (open && !prevOpen.current) {
            setRows(buildRows(items))
        }
        prevOpen.current = open
    }, [open, items])

    const needAction   = rows.filter(r => r.missing > 0)
    const selectedRows = rows.filter(r => r.selected && r.missing > 0)
    const inStockCount = items.filter(g => g.missing === 0).length

    const toggle  = (id: string) => setRows(prev => prev.map(r => r.ingredientId === id ? { ...r, selected: !r.selected } : r))
    const setDest = (id: string, destination: 'shopping' | 'pantry') => setRows(prev => prev.map(r => r.ingredientId === id ? { ...r, destination } : r))
    const setQty  = (id: string, quantity: number) => setRows(prev => prev.map(r => r.ingredientId === id ? { ...r, quantity } : r))
    const selectAll = () => setRows(prev => prev.map(r => r.missing > 0 ? { ...r, selected: true } : r))

    const handleSubmit = async () => {
        if (selectedRows.length === 0) return
        setSubmitting(true)
        try {
            const endpoint = submitUrl ?? `/api/planned-collections/${collectionId}/add-ingredients`
            const res = await fetch(endpoint, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    items: selectedRows.map(r => ({
                        ingredientId: r.ingredientId,
                        destination:  r.destination,
                        quantity:     r.quantity,
                        unit:         r.unit,
                    })),
                }),
            })
            if (!res.ok) throw new Error()
            const json = await res.json()
            onSuccess({ shopping: json.data.addedToShopping, pantry: json.data.addedToPantry })
            onClose()
        } catch {
            toast.error('Could not add ingredients')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-lg flex flex-col p-0 gap-0 overflow-hidden max-h-[85vh]">

                <DialogHeader className="px-6 pt-6 pb-4 border-b border-line shrink-0">
                    <DialogTitle className="font-headline text-fg text-left">
                        Stock up ingredients
                    </DialogTitle>
                    <p className="text-xs text-fg-muted text-left">
                        Select which ingredients to add and choose a destination.
                    </p>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">

                    {/* In-stock summary */}
                    {inStockCount > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-brand pb-1">
                            <Check size={12} />
                            <span>
                                {inStockCount} ingredient{inStockCount !== 1 ? 's' : ''} already in stock
                            </span>
                        </div>
                    )}

                    {needAction.length === 0 && (
                        <p className="text-sm text-fg-muted text-center py-8">
                            All ingredients are already in stock!
                        </p>
                    )}

                    {needAction.length > 0 && (
                        <>
                            <div className="flex items-center justify-between pb-1">
                                <span className="text-[10px] font-label uppercase tracking-widest text-fg-muted">
                                    {needAction.length} need{needAction.length === 1 ? 's' : ''} attention
                                </span>
                                <button
                                    onClick={selectAll}
                                    className="text-xs text-brand hover:underline"
                                >
                                    Select all
                                </button>
                            </div>

                            {needAction.map(g => {
                                const row    = rows.find(r => r.ingredientId === g.ingredientId)!
                                const status = statusOf(g)
                                const meta   = STATUS_META[status]

                                return (
                                    <div
                                        key={g.ingredientId}
                                        className={`rounded-lg border p-3 transition-colors ${
                                            row.selected
                                                ? 'border-brand-soft/50 bg-brand-soft/5'
                                                : 'border-line bg-surface'
                                        }`}
                                    >
                                        {/* Top row: checkbox + name + badge */}
                                        <div className="flex items-start gap-2">
                                            <button
                                                onClick={() => toggle(g.ingredientId)}
                                                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                    row.selected
                                                        ? 'bg-brand border-brand'
                                                        : 'border-line-control bg-surface'
                                                }`}
                                            >
                                                {row.selected && <Check size={10} className="text-fg-on-brand" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm text-fg font-medium">
                                                        {g.ingredientName}
                                                    </span>
                                                    <span className={`text-[10px] font-label uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 ${meta.pill}`}>
                                                        {meta.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-fg-muted">
                                                    <span>Need {g.missing}{g.unit}</span>
                                                    {g.inPantry > 0 && (
                                                        <span>· Have {g.inPantry}{g.unit}</span>
                                                    )}
                                                    {g.inWishlist && (
                                                        <span className="flex items-center gap-0.5">
                                                            · <ShoppingCart size={9} className="inline" /> In list
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Controls (only when selected) */}
                                        {row.selected && (
                                            <div className="mt-3 ml-6 flex items-center gap-3 flex-wrap">
                                                {/* Quantity */}
                                                <div className="flex items-center gap-1.5">
                                                    <label className="text-[10px] font-label uppercase tracking-widest text-fg-muted">
                                                        Qty
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0.01}
                                                        step={0.01}
                                                        value={row.quantity}
                                                        onChange={e => setQty(g.ingredientId, parseFloat(e.target.value) || 0)}
                                                        className="w-16 text-xs text-center border border-line-control rounded px-1.5 py-1 focus:outline-none focus:border-brand-soft"
                                                    />
                                                    <span className="text-[11px] text-fg-muted">{g.unit}</span>
                                                </div>

                                                {/* Destination toggle */}
                                                <div className="flex rounded-full border border-line overflow-hidden text-[10px] font-label uppercase tracking-widest">
                                                    <button
                                                        onClick={() => setDest(g.ingredientId, 'shopping')}
                                                        className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
                                                            row.destination === 'shopping'
                                                                ? 'bg-brand text-fg-on-brand'
                                                                : 'text-fg-muted hover:bg-line/60'
                                                        }`}
                                                    >
                                                        <ShoppingCart size={9} /> Shopping
                                                    </button>
                                                    <button
                                                        onClick={() => setDest(g.ingredientId, 'pantry')}
                                                        className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
                                                            row.destination === 'pantry'
                                                                ? 'bg-brand text-fg-on-brand'
                                                                : 'text-fg-muted hover:bg-line/60'
                                                        }`}
                                                    >
                                                        <Package size={9} /> Pantry
                                                    </button>
                                                </div>

                                                {/* Hint */}
                                                <span className="text-[10px] text-fg-muted italic">
                                                    {row.destination === 'shopping'
                                                        ? 'Sets shopping qty to needed amount'
                                                        : 'Adds to your current pantry stock'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t border-line bg-surface shrink-0 sm:justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-label uppercase tracking-widest text-fg-muted hover:text-fg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={selectedRows.length === 0 || submitting}
                        className="px-5 py-2 text-xs font-label uppercase tracking-widest rounded-full bg-brand text-fg-on-brand hover:bg-brand/90 disabled:opacity-40 transition-colors"
                    >
                        {submitting
                            ? 'Adding…'
                            : `Add ${selectedRows.length} item${selectedRows.length !== 1 ? 's' : ''}`}
                    </button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}
