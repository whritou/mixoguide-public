'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Loader2, Trash2 } from 'lucide-react'
import type { CocktailMadeLog } from '@/types/models/cocktail-made-log'
import { formatMonthDayYear, parseIsoDate } from '@/lib/planner-dashboard/plannerDateUtils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface RecentMadeCardProps {
    item:        CocktailMadeLog
    onRemove:    (id: string) => Promise<void>
    selectable?: boolean
    selected?:   boolean
    onSelect?:   () => void
}

export default function RecentMadeCard({ item, onRemove, selectable, selected, onSelect }: RecentMadeCardProps) {
    const [removing, setRemoving] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)

    const handleRemove = async () => {
        if (removing) return
        setRemoving(true)
        try {
            await onRemove(item.id)
        } finally {
            setRemoving(false)
        }
    }

    return (
        <article className={`relative rounded-2xl border bg-white transition-colors ${selected ? 'border-mg-brown ring-1 ring-mg-brown' : 'border-mg-sand'}`}>
            {selectable && (
                <button
                    type="button"
                    onClick={() => onSelect?.()}
                    className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 transition-colors flex items-center justify-center ${
                        selected ? 'bg-mg-brown border-mg-brown' : 'bg-white border-mg-bone hover:border-mg-brown'
                    }`}
                    aria-label={selected ? 'Deselect' : 'Select'}
                >
                    {selected && <Check size={11} className="text-white" />}
                </button>
            )}
            <div className="flex items-start gap-3">
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-l-xl bg-mg-sand">
                    <Image
                        src={item.cocktail?.imageUrl ?? '/placeholder.svg'}
                        alt={item.cocktail?.name ?? 'Cocktail'}
                        fill
                        sizes="56px"
                        className="object-cover"
                    />
                </div>

                <div className="min-w-0 flex-1 p-3">
                    <h3
                        className="line-clamp-1 font-headline text-xl text-mg-ink"
                        title={item.cocktail?.name ?? 'Cocktail'}
                    >
                        {item.cocktail?.name ?? '-'}
                    </h3>
                    <p className="mt-1 text-xs text-mg-muted">
                        Made {formatMonthDayYear(parseIsoDate(item.madeAt))}
                        {item.quantity > 1 ? `  -  ${item.quantity} servings` : ''}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setConfirmRemove(true)}
                    disabled={removing}
                    className="rounded-full m-1 p-1.5 text-mg-muted hover:bg-mg-danger-light hover:text-mg-danger transition-colors disabled:opacity-50"
                    title="Remove from history"
                >
                    {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
            </div>
            {confirmRemove && (
                <ConfirmDialog
                    title="Remove from history?"
                    description={`"${item.cocktail?.name ?? 'This cocktail'}" will be removed from your made log.`}
                    confirmLabel="Remove"
                    onConfirm={() => { setConfirmRemove(false); void handleRemove() }}
                    onCancel={() => setConfirmRemove(false)}
                />
            )}
        </article>
    )
}

