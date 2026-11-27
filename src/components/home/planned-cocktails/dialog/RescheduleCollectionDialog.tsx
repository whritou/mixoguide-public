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
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-overlay/67 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-canvas rounded-2xl shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-line">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={18} className="text-brand-soft" />
                        <h2 className="font-headline text-xl text-fg">Reschedule</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-line transition-colors text-fg-muted"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-fg-muted">
                        When is{' '}<span className="font-medium text-fg">{item.title}</span>?
                    </p>
                    <div>
                        <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                            New date *
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm text-fg focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-line">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-line/60 text-fg-secondary hover:bg-line transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!date || saving}
                        onClick={handleConfirm}
                        className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving…' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    )
}
