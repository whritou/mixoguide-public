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
    'in-stock': { label: 'In stock',  pill: 'bg-mg-brown/10 text-mg-brown',  dot: 'bg-mg-brown' },
    'in-list':  { label: 'In shopping list',   pill: 'bg-mg-caramel/20 text-mg-brown',  dot: 'bg-mg-caramel' },
    'partial':  { label: 'Partial',   pill: 'bg-amber-100 text-amber-800',      dot: 'bg-amber-400' },
    'missing':  { label: 'Missing',   pill: 'bg-mg-danger-light/80 text-mg-danger',  dot: 'bg-mg-danger' },
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

                <DialogHeader className="px-6 pt-6 pb-4 border-b border-mg-sand shrink-0">
                    <DialogTitle className="font-headline text-mg-ink text-left">
                        Stock up ingredients
                    </DialogTitle>
                    <p className="text-xs text-mg-muted text-left">
                        Select which ingredients to add and choose a destination.
                    </p>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">

                    {/* In-stock summary */}
                    {inStockCount > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-mg-brown pb-1">
                            <Check size={12} />
                            <span>
                                {inStockCount} ingredient{inStockCount !== 1 ? 's' : ''} already in stock
                            </span>
                        </div>
                    )}

                    {needAction.length === 0 && (
                        <p className="text-sm text-mg-muted text-center py-8">
                            All ingredients are already in stock!
                        </p>
                    )}

                    {needAction.length > 0 && (
                        <>
                            <div className="flex items-center justify-between pb-1">
                                <span className="text-[10px] font-label uppercase tracking-widest text-mg-muted">
                                    {needAction.length} need{needAction.length === 1 ? 's' : ''} attention
                                </span>
                                <button
                                    onClick={selectAll}
                                    className="text-xs text-mg-brown hover:underline"
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
                                                ? 'border-mg-caramel/50 bg-mg-caramel/5'
                                                : 'border-mg-sand bg-white'
                                        }`}
                                    >
                                        {/* Top row: checkbox + name + badge */}
                                        <div className="flex items-start gap-2">
                                            <button
                                                onClick={() => toggle(g.ingredientId)}
                                                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                    row.selected
                                                        ? 'bg-mg-brown border-mg-brown'
                                                        : 'border-mg-muted bg-white'
                                                }`}
                                            >
                                                {row.selected && <Check size={10} className="text-white" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm text-mg-ink font-medium">
                                                        {g.ingredientName}
                                                    </span>
                                                    <span className={`text-[10px] font-label uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0 ${meta.pill}`}>
                                                        {meta.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-mg-muted">
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
                                                    <label className="text-[10px] font-label uppercase tracking-widest text-mg-muted">
                                                        Qty
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0.01}
                                                        step={0.01}
                                                        value={row.quantity}
                                                        onChange={e => setQty(g.ingredientId, parseFloat(e.target.value) || 0)}
                                                        className="w-16 text-xs text-center border border-mg-sand rounded px-1.5 py-1 focus:outline-none focus:border-mg-caramel"
                                                    />
                                                    <span className="text-[11px] text-mg-muted">{g.unit}</span>
                                                </div>

                                                {/* Destination toggle */}
                                                <div className="flex rounded-full border border-mg-sand overflow-hidden text-[10px] font-label uppercase tracking-widest">
                                                    <button
                                                        onClick={() => setDest(g.ingredientId, 'shopping')}
                                                        className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
                                                            row.destination === 'shopping'
                                                                ? 'bg-mg-brown text-white'
                                                                : 'text-mg-muted hover:bg-mg-sand/60'
                                                        }`}
                                                    >
                                                        <ShoppingCart size={9} /> Shopping
                                                    </button>
                                                    <button
                                                        onClick={() => setDest(g.ingredientId, 'pantry')}
                                                        className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
                                                            row.destination === 'pantry'
                                                                ? 'bg-mg-brown text-white'
                                                                : 'text-mg-muted hover:bg-mg-sand/60'
                                                        }`}
                                                    >
                                                        <Package size={9} /> Pantry
                                                    </button>
                                                </div>

                                                {/* Hint */}
                                                <span className="text-[10px] text-mg-muted italic">
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
                <DialogFooter className="px-6 py-4 border-t border-mg-sand bg-white shrink-0 sm:justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-label uppercase tracking-widest text-mg-muted hover:text-mg-ink transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={selectedRows.length === 0 || submitting}
                        className="px-5 py-2 text-xs font-label uppercase tracking-widest rounded-full bg-mg-brown text-white hover:bg-[#5c4023] disabled:opacity-40 transition-colors"
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
