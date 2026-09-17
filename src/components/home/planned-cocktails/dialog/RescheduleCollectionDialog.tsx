'use client'

import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { usePlannedCollectionMutations } from '@/hooks/mutations/use-planned-collection-mutations'
import type { PlannedCollection } from '@/types/models/planned-collection'

interface Props {
    item: PlannedCollection
    onRescheduled: () => void
    onClose: () => void
}

export default function RescheduleCollectionDialog({ item, onRescheduled, onClose }: Props) {
    const { update } = usePlannedCollectionMutations()
    const [date, setDate] = useState(item.plannedFor.split('T')[0])
    const [saving, setSaving] = useState(false)

    const handleConfirm = async () => {
        if (!date) return
        setSaving(true)
        try {
            await update.mutateAsync({
                id:   item.id,
                data: { plannedFor: new Date(date + 'T12:00:00').toISOString() },
            })
            toast.success(`${item.title} rescheduled`)
            onRescheduled()
        } catch {
            toast.error('Could not reschedule')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-mg-ink/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-mg-cream rounded-2xl shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-mg-sand">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={18} className="text-mg-caramel" />
                        <h2 className="font-headline text-xl text-mg-ink">Reschedule</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mg-sand transition-colors text-mg-muted"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-mg-muted">
                        When is{' '}<span className="font-medium text-mg-ink">{item.title}</span>?
                    </p>
                    <div>
                        <label className="block text-xs font-label uppercase tracking-widest text-mg-muted mb-1.5">
                            New date *
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white border border-mg-bone text-sm text-mg-ink focus:outline-none focus:ring-1 focus:ring-mg-caramel"
                        />
                    </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-mg-sand">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-mg-sand/60 text-mg-charcoal hover:bg-mg-sand transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!date || saving}
                        onClick={handleConfirm}
                        className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-gradient-to-br from-mg-brown to-mg-caramel text-white hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving…' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    )
}
