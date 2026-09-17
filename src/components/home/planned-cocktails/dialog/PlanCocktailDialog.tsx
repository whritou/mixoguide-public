'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { X, Minus, Plus } from 'lucide-react'
import { usePlannedCocktailMutations } from '@/hooks/mutations/use-planned-cocktail-mutations'

interface Props {
    cocktailId:   string
    cocktailName: string
    open:         boolean
    onOpenChange: (b: boolean) => void
    onPlanned:    () => void
}

export default function PlanCocktailDialog({
    cocktailId, cocktailName, open, onOpenChange, onPlanned,
}: Props) {
    const today = new Date().toISOString().split('T')[0]

    const { create } = usePlannedCocktailMutations()

    const [date,       setDate]       = useState(today)
    const [quantity,   setQuantity]   = useState(1)
    const [submitting, setSubmitting] = useState(false)

    if (!open) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!date) { toast.error('Please pick a date'); return }

        setSubmitting(true)
        try {
            const result = await create.mutateAsync({
                cocktailId,
                plannedFor: new Date(date).toISOString(),
                quantity,
                status:     'planned',
            })
            if (!result) throw new Error('Could not plan cocktail')
            toast.success(`${quantity}x ${cocktailName} planned for ${new Date(date).toLocaleDateString()}`)
            onPlanned()
            onOpenChange(false)
            setDate(today)
            setQuantity(1)
        } catch {
            toast.error('Could not plan cocktail')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-mg-ink/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-mg-cream rounded-2xl shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-mg-sand">
                    <h2 className="font-headline text-xl text-mg-ink">Plan a cocktail</h2>
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
                            When do you want to make{' '}
                            <span className="font-medium text-mg-ink">{cocktailName}</span>?
                        </p>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                Date *
                            </label>
                            <input
                                type="date"
                                value={date}
                                min={today}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-bone text-sm font-body text-mg-ink
                                           focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                            />
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                Servings
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-mg-bone
                                               hover:bg-mg-sand transition-colors text-mg-charcoal disabled:opacity-40"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="w-8 text-center font-body text-sm font-medium text-mg-ink">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity(q => Math.min(50, q + 1))}
                                    disabled={quantity >= 50}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-mg-bone
                                               hover:bg-mg-sand transition-colors text-mg-charcoal disabled:opacity-40"
                                >
                                    <Plus size={14} />
                                </button>
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
                            disabled={submitting || !date}
                            className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full
                                       bg-gradient-to-br from-mg-brown to-mg-caramel text-white
                                       hover:scale-[0.98] transition-transform duration-200
                                       disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {submitting ? 'Planning…' : `Plan ${quantity > 1 ? `${quantity}x` : 'it'}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
