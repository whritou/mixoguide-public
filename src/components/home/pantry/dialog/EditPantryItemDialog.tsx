import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { toast }  from 'sonner'
import { X }      from 'lucide-react'
import clsx       from 'clsx'
import { usePantryMutations } from '@/hooks/mutations/use-pantry-mutations'
import type { UserPantryItem } from '@/types/models/pantry'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const UNITS = ['cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist'] as const

const SWITCHES = [
    { key: 'favorite',    label: 'Favourite', sub: 'Show this in your favourites' },
    { key: 'isEssential', label: 'Essential', sub: 'A pantry staple you always keep' },
    { key: 'isInfinite',  label: 'Always stocked', sub: 'Water, sugar, syrup… never runs out' },
] as const

type SwitchKey = typeof SWITCHES[number]['key']
type Destination = 'pantry' | 'shopping'

interface Props {
    open:         boolean
    onOpenChange: (b: boolean) => void
    item:         UserPantryItem
    contextMode?: 'default' | 'shopping'
    onUpdated:    () => void
}

export default function EditPantryItemDialog({
                                                 open,
                                                 onOpenChange,
                                                 item,
                                                 contextMode = 'default',
                                                 onUpdated,
                                             }: Props) {

    const { update, remove } = usePantryMutations()

    const [qty,        setQty]        = useState('')
    const [unit,       setUnit]       = useState('pcs')
    const [expiryDate, setExpiryDate] = useState('')
    const [note,       setNote]       = useState('')
    const [switches,   setSwitches]   = useState<Record<SwitchKey, boolean>>({
        favorite: false,
        isEssential: false,
        isInfinite: false,
    })
    const [destination,  setDestination]  = useState<Destination>('pantry')
    const [submitting,   setSubmitting]   = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (open) {
            setQty(String(contextMode === 'shopping' ? (item.shoppingQuantity ?? 0) : item.quantity))
            setUnit(item.unitLeft)
            setExpiryDate(item.expirationDate ? item.expirationDate.split('T')[0] : '')
            setNote(item.note ?? '')

            setSwitches({
                favorite: item.favorite,
                isEssential: item.isEssential,
                isInfinite: item.isInfinite ?? false,
            })

            setDestination(contextMode === 'shopping' ? 'shopping' : (item.isInPantry ? 'pantry' : 'shopping'))
        }
    }, [open, item, contextMode])

    if (!open) return null

    const setSwitch = (key: SwitchKey, val: boolean) =>
        setSwitches(prev => ({ ...prev, [key]: val }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!switches.isInfinite && (!qty || Number(qty) <= 0)) {
            toast.error('Please enter a valid quantity')
            return
        }

        setSubmitting(true)
        try {
            const data = contextMode === 'shopping'
                ? {
                    shoppingQuantity: Number(qty),
                    unitLeft:         unit,
                    favorite:         switches.favorite,
                    isEssential:      switches.isEssential,
                    isInfinite:       switches.isInfinite,
                    isInShoppingList: Number(qty) > 0,
                    expirationDate:   expiryDate ? new Date(expiryDate).toISOString() : null,
                    note:             note.trim() || null,
                }
                : {
                    quantity:         switches.isInfinite ? 0 : Number(qty),
                    unitLeft:         unit,
                    favorite:         switches.favorite,
                    isEssential:      switches.isEssential,
                    isInfinite:       switches.isInfinite,
                    isInPantry:       destination === 'pantry',
                    isInShoppingList: destination === 'shopping',
                    expirationDate:   expiryDate ? new Date(expiryDate).toISOString() : null,
                    note:             note.trim() || null,
                }
            const result = await update.mutateAsync({ id: item.id, data })

            if (!result) throw new Error()
            toast.success(`${item.ingredient?.name ?? 'Item'} updated`)
            onUpdated()
            onOpenChange(false)
        } catch {
            toast.error('Error while updating item')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        setSubmitting(true)
        try {
            if (contextMode === 'shopping') {
                await update.mutateAsync({
                    id: item.id,
                    data: { shoppingQuantity: 0, isInShoppingList: false },
                })
                toast.success(`${item.ingredient?.name ?? 'Item'} removed from shopping list`)
            } else {
                await remove.mutateAsync(item.id)
                toast.success(`${item.ingredient?.name ?? 'Item'} removed`)
            }
            onUpdated()
            onOpenChange(false)
        } catch {
            toast.error('Error while deleting item')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mg-ink/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-mg-cream rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-mg-sand">
                    <h2 className="font-headline text-xl text-mg-ink">
                        Edit {item.ingredient?.name ?? 'item'}
                    </h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        aria-label="Close"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mg-sand transition-colors"
                    >
                        <X size={16} className="text-mg-muted" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
                    <div className="px-6 py-5 space-y-5">

                        {/* Quantity + Unit */}
                        <div className="grid grid-cols-5 gap-3">
                            <div className="col-span-3">
                                <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                    {contextMode === 'shopping' ? 'Shopping quantity' : 'Quantity'}
                                </label>
                                <input
                                    type="number"
                                    value={qty}
                                    onChange={e => setQty(e.target.value)}
                                    min="0"
                                    step="0.1"
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-sand text-sm font-body text-mg-ink
                             placeholder:text-mg-muted focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                    Unit
                                </label>
                                <select
                                    value={unit}
                                    onChange={e => setUnit(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-sand text-sm font-body text-mg-ink
                             focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                                >
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Expiration date */}
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                Expiration date
                                <span className="ml-1 text-mg-muted/60 normal-case font-body tracking-normal">(optional)</span>
                            </label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={e => setExpiryDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-sand text-sm font-body text-mg-ink
                           focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                            />
                        </div>

                        {contextMode !== 'shopping' && (
                            <div>
                                <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                    Add to
                                </label>
                                <div className="flex rounded-xl border border-mg-sand overflow-hidden">
                                    {([
                                        { value: 'pantry' as Destination, label: 'Pantry', sub: 'Available in your bar' },
                                        { value: 'shopping' as Destination, label: 'Shopping list', sub: 'Buy it later' },
                                    ] as const).map(({ value, label, sub }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setDestination(value)}
                                            className={clsx(
                                                'flex-1 px-4 py-3 text-left transition-colors',
                                                destination === value
                                                    ? 'bg-gradient-to-br from-mg-brown/10 to-mg-caramel/10 border-mg-caramel'
                                                    : 'bg-white hover:bg-mg-smoke',
                                                value === 'pantry' && 'border-r border-mg-sand',
                                            )}
                                        >
                                            <p className={clsx(
                                                'text-sm font-body leading-none mb-0.5',
                                                destination === value ? 'text-mg-brown font-medium' : 'text-mg-ink',
                                            )}>{label}</p>
                                            <p className="text-xs text-mg-muted">{sub}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Switches */}
                        <div className="rounded-xl border border-mg-sand overflow-hidden divide-y divide-mg-sand">
                            {SWITCHES.map(({ key, label, sub }) => (
                                <div key={key} className="flex items-center justify-between px-4 py-3 bg-white">
                                    <div>
                                        <p className="text-sm font-body text-mg-ink leading-none mb-0.5">{label}</p>
                                        <p className="text-xs text-mg-muted">{sub}</p>
                                    </div>
                                    <Switch
                                        checked={switches[key]}
                                        onCheckedChange={v => setSwitch(key, v)}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Note */}
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                Note
                            </label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                rows={2}
                                maxLength={500}
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-sand text-sm font-body text-mg-ink
                           focus:outline-none focus:ring-1 focus:ring-mg-caramel resize-none"
                            />
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 px-6 py-4 border-t border-mg-sand bg-mg-cream">
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            disabled={submitting}
                            className="py-2.5 px-4 text-xs font-label uppercase tracking-widest rounded-full
                         bg-mg-danger/10 text-mg-danger hover:bg-mg-danger/20 transition-colors"
                        >
                            Delete
                        </button>

                        <div className="flex gap-3 flex-1">
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full
                           bg-mg-sand/60 text-mg-charcoal"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={submitting || (!switches.isInfinite && (!qty || Number(qty) <= 0))}
                                className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full
                           bg-gradient-to-br from-mg-brown to-mg-caramel text-white"
                            >
                                {submitting ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>

                </form>
            </div>
            {confirmDelete && (
                <ConfirmDialog
                    title={`Delete ${item.ingredient?.name ?? 'item'}?`}
                    description={contextMode === 'shopping' ? 'This will remove it from your shopping list.' : 'This will permanently remove it from your pantry.'}
                    confirmLabel="Delete"
                    onConfirm={() => { setConfirmDelete(false); void handleDelete() }}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </div>
    )
}
