'use client'

import { useMemo, useState } from 'react'
import { Check, Loader2, PackagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { usePantryMutations } from '@/hooks/mutations/use-pantry-mutations'
import { isRestockCandidate, restockQuantityForUnit } from '@/utils/pantryRestock'
import type { UserPantryItem } from '@/types/models/pantry'

type RestockRow = {
    item: UserPantryItem
    selected: boolean
    quantity: number
}

type RestockPantryDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    items: UserPantryItem[]
    onRestocked: () => void
}

function buildRows(items: UserPantryItem[]): RestockRow[] {
    return items
        .filter(isRestockCandidate)
        .sort((a, b) => {
            const outSort = Number(a.quantity > 0) - Number(b.quantity > 0)
            if (outSort !== 0) return outSort
            return (a.ingredient?.name ?? '').localeCompare(b.ingredient?.name ?? '')
        })
        .map((item) => ({
            item,
            selected: true,
            quantity: restockQuantityForUnit(item.unitLeft),
        }))
}

function rowsKey(items: UserPantryItem[]): string {
    return buildRows(items)
        .map(({ item }) => `${item.id}:${item.quantity}:${item.unitLeft}`)
        .join('|')
}

export default function RestockPantryDialog(props: RestockPantryDialogProps) {
    const resetKey = useMemo(
        () => `${props.open ? 'open' : 'closed'}:${rowsKey(props.items)}`,
        [props.open, props.items],
    )

    return <RestockPantryDialogContent key={resetKey} {...props} />
}

function RestockPantryDialogContent({
    open,
    onOpenChange,
    items,
    onRestocked,
}: RestockPantryDialogProps) {
    const { restock } = usePantryMutations()
    const [rows, setRows] = useState<RestockRow[]>(() => buildRows(items))

    const selectedRows = useMemo(
        () => rows.filter((row) => row.selected && row.quantity > 0),
        [rows],
    )

    const toggle = (id: string) => {
        setRows((prev) => prev.map((row) =>
            row.item.id === id ? { ...row, selected: !row.selected } : row
        ))
    }

    const setQty = (id: string, quantity: number) => {
        setRows((prev) => prev.map((row) =>
            row.item.id === id ? { ...row, quantity } : row
        ))
    }

    const selectAll = () => {
        setRows((prev) => prev.map((row) => ({ ...row, selected: true })))
    }

    const close = () => onOpenChange(false)

    const handleSubmit = async () => {
        if (selectedRows.length === 0) return

        try {
            const result = await restock.mutateAsync(
                selectedRows.map(({ item, quantity }) => ({
                    ingredientId: item.ingredientId,
                    quantity,
                    unit: item.unitLeft,
                })),
            )
            toast.success(`${result.addedToPantry} item${result.addedToPantry !== 1 ? 's' : ''} restocked`)
            onRestocked()
            close()
        } catch {
            toast.error('Could not restock pantry')
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-lg bg-canvas rounded-2xl shadow-2xl flex flex-col max-h-[90vh] p-0 border-0 gap-0 overflow-hidden [&>button]:hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-line">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-[10px] font-label uppercase tracking-widest text-brand-soft-strong">
                            <PackagePlus size={13} />
                            Restock pantry
                        </div>
                        <DialogTitle className="font-headline text-xl text-fg">Low and empty items</DialogTitle>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close restock pantry dialog"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-line transition-colors"
                    >
                        <X size={16} className="text-fg-muted" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
                    {rows.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="font-headline italic text-xl text-fg">All stocked up</p>
                            <p className="mt-1 text-sm text-fg-muted">No low or empty pantry items right now.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-[10px] font-label uppercase tracking-widest text-fg-muted">
                                    {rows.length} item{rows.length !== 1 ? 's' : ''} need restock
                                </span>
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="text-xs text-brand hover:underline"
                                >
                                    Select all
                                </button>
                            </div>

                            <div className="space-y-2">
                                {rows.map(({ item, selected, quantity }) => {
                                    const ingredientName = item.ingredient?.name ?? 'Unknown ingredient'
                                    const out = item.quantity <= 0

                                    return (
                                        <div
                                            key={item.id}
                                            className={clsx(
                                                'rounded-xl border p-3 transition-colors',
                                                selected
                                                    ? 'border-brand-soft/50 bg-brand-soft/5'
                                                    : 'border-line bg-surface',
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => toggle(item.id)}
                                                    aria-label={`${selected ? 'Remove' : 'Add'} ${ingredientName} from restock batch`}
                                                    aria-pressed={selected}
                                                    className={clsx(
                                                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                                                        selected
                                                            ? 'border-brand bg-brand'
                                                            : 'border-line-control bg-surface',
                                                    )}
                                                >
                                                    {selected && <Check size={12} className="text-fg-on-brand" />}
                                                </button>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-medium text-fg">{ingredientName}</span>
                                                        <span className={clsx(
                                                            'rounded-full px-2 py-0.5 text-[10px] font-label uppercase tracking-wider',
                                                            out
                                                                ? 'bg-danger-bg/80 text-danger'
                                                                : 'bg-brand-soft/15 text-brand',
                                                        )}>
                                                            {out ? 'Out' : 'Low'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-[11px] text-fg-muted">
                                                        Current stock: {item.quantity} {item.unitLeft}
                                                    </p>
                                                </div>
                                            </div>

                                            {selected && (
                                                <div className="ml-8 mt-3 flex items-center gap-2">
                                                    <label className="text-[10px] font-label uppercase tracking-widest text-fg-muted">
                                                        Add
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0.01}
                                                        step={0.01}
                                                        value={quantity}
                                                        onChange={(event) => setQty(item.id, parseFloat(event.target.value) || 0)}
                                                        className="w-20 rounded-lg border border-line-control bg-surface px-2 py-1.5 text-center text-xs text-fg focus:outline-none focus:ring-1 focus:ring-ring"
                                                    />
                                                    <span className="text-xs text-fg-muted">{item.unitLeft}</span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-line bg-canvas">
                    <button
                        type="button"
                        onClick={close}
                        className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-line/60 text-fg-secondary hover:bg-line transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => { void handleSubmit() }}
                        disabled={selectedRows.length === 0 || restock.isPending}
                        className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand hover:scale-[0.98] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        {restock.isPending ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 size={13} className="animate-spin" />
                                Restocking
                            </span>
                        ) : (
                            `Restock ${selectedRows.length || ''}`
                        )}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
