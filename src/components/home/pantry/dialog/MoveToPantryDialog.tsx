import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { usePantryMutations } from '@/hooks/mutations/use-pantry-mutations'
import { resolveIngredientUnitFallback } from '@/utils/ingredientUnitFallback'

const UNITS = ['cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist'] as const

interface Props {
    open:          boolean
    onOpenChange:  (b: boolean) => void
    item: {
        id:           string
        ingredientId: string
        ingredient?:  {
            name: string
            isAlcoholic?: boolean
            type?: { name: string }
            subType?: { name: string }
        }
        shoppingQuantity:     number
        unitLeft:     string
        isInPantry:   boolean
    }
    onDone: () => void
}

export default function MoveToPantryDialog({ open, onOpenChange, item, onDone }: Props) {
    const { moveToPantry } = usePantryMutations()

    const [qty,        setQty]        = useState('')
    const [unit,       setUnit]       = useState('pcs')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            setQty(item.shoppingQuantity > 0 ? String(item.shoppingQuantity) : '')
            setUnit(item.unitLeft || resolveIngredientUnitFallback({
                ingredientName: item.ingredient?.name,
                typeName: item.ingredient?.type?.name,
                subTypeName: item.ingredient?.subType?.name,
                isAlcoholic: item.ingredient?.isAlcoholic,
            }))
        }
    }, [open, item.shoppingQuantity, item.unitLeft, item.ingredient])

    if (!open) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!qty || Number(qty) <= 0) {
            toast.error('Please enter a valid quantity')
            return
        }

        setSubmitting(true)
        try {
            const result = await moveToPantry.mutateAsync({
                ingredientId: item.ingredientId,
                amount:       Number(qty),
                unitLeft:     unit,
            })

            if (!result) throw new Error()
            toast.success(`${item.ingredient?.name ?? 'Item'} moved to pantry`)
            onDone()
            onOpenChange(false)
        } catch {
            toast.error('Failed to move item to pantry')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mg-ink/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-mg-cream rounded-2xl shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-mg-sand">
                    <h2 className="font-headline text-xl text-mg-ink">Add to Pantry</h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mg-sand transition-colors"
                    >
                        <X size={16} className="text-mg-muted" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                    <div className="px-6 py-5 space-y-5">

                        <p className="text-sm font-body text-mg-muted">
                            How much{' '}
                            <span className="font-medium text-mg-ink">
                                {item.ingredient?.name ?? 'this ingredient'}
                            </span>{' '}
                            are you adding to your pantry?
                        </p>

                        {/* Quantity + Unit */}
                        <div className="grid grid-cols-5 gap-3">
                            <div className="col-span-3">
                                <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    value={qty}
                                    onChange={e => setQty(e.target.value)}
                                    min="0"
                                    step="0.1"
                                    placeholder="0"
                                    autoFocus
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
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 px-6 py-4 border-t border-mg-sand bg-mg-cream rounded-b-2xl">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full
                                       bg-mg-sand/60 text-mg-charcoal hover:bg-mg-sand transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !qty || Number(qty) <= 0}
                            className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full
                                       bg-gradient-to-br from-mg-brown to-mg-caramel text-white
                                       hover:scale-[0.98] transition-transform duration-200
                                       disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {submitting ? 'Moving…' : 'Add to Pantry'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
