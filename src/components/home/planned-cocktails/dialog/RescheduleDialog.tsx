'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { X, Minus, Plus, CalendarDays } from 'lucide-react'
import { usePlannedCocktailMutations } from '@/hooks/mutations/use-planned-cocktail-mutations'
import type { PlannedCocktail } from '@/types/models/planned-cocktail'

interface Props {
    item:          PlannedCocktail
    open:          boolean
    onOpenChange:  (b: boolean) => void
    onRescheduled: () => void
}

export default function RescheduleDialog({ item, open, onOpenChange, onRescheduled }: Props) {
    const today = new Date().toISOString().split('T')[0]
    const { update } = usePlannedCocktailMutations()
    const [mounted, setMounted] = useState(false)

    const initialDate = item.plannedFor.split('T')[0]
    const [date,       setDate]       = useState(initialDate)
    const [quantity,   setQuantity]   = useState(item.quantity)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!open || !mounted) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!date) { toast.error('Please pick a date'); return }

        setSubmitting(true)
        try {
            await update.mutateAsync({
                id:   item.id,
                data: {
                    plannedFor: new Date(date + 'T12:00:00').toISOString(),
                    quantity,
                },
            })
            toast.success(`${item.cocktail?.name ?? 'Cocktail'} rescheduled`)
            onRescheduled()
            onOpenChange(false)
        } catch {
            toast.error('Could not reschedule')
        } finally {
            setSubmitting(false)
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-mg-ink/50 backdrop-blur-sm"
            style={{ zIndex: 9999 }}
        >
            <div className="w-full max-w-sm bg-mg-cream rounded-2xl shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-mg-sand">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={18} className="text-mg-caramel" />
                        <h2 className="font-headline text-xl text-mg-ink">Reschedule</h2>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        aria-label="Close"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mg-sand transition-colors"
                    >
                        <X size={16} className="text-mg-muted" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="px-6 py-5 space-y-5">

                        <p className="text-sm text-mg-muted">
                            When do you want to make{' '}
                            <span className="font-medium text-mg-ink">{item.cocktail?.name ?? 'this cocktail'}</span>?
                        </p>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                New date *
                            </label>
                            <input
                                type="date"
                                value={date}
                                min={today}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-bone text-sm text-mg-ink
                                           focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                            />
                        </div>

                        {/* Servings */}
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                                Servings
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                    aria-label="Decrease servings"
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-mg-bone
                                               hover:bg-mg-sand transition-colors text-mg-charcoal disabled:opacity-40"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="w-8 text-center text-sm font-medium text-mg-ink">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity(q => Math.min(50, q + 1))}
                                    disabled={quantity >= 50}
                                    aria-label="Increase servings"
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-mg-bone
                                               hover:bg-mg-sand transition-colors text-mg-charcoal disabled:opacity-40"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 px-6 py-4 border-t border-mg-sand rounded-b-2xl">
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
                                       bg-gradient-to-br from-mg-brown to-mg-caramel text-white hover:opacity-80 transition-opacity
                                       disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Saving…' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    )
}
