'use client'

import { useState, type MouseEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, Loader2, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { usePlannedCollectionMutations } from '@/hooks/mutations/use-planned-collection-mutations'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { PlannedCollection } from '@/types/models/planned-collection'
import {
    formatMonthDay,
    isOverdueDate,
    parseIsoDate,
    relativeDateLabel,
} from '@/lib/planner-dashboard/plannerDateUtils'

interface UpcomingCollectionCardProps {
    item: PlannedCollection
    now: Date
    onUpdate: () => void
}

export default function UpcomingCollectionCard({ item, now, onUpdate }: UpcomingCollectionCardProps) {
    const { remove: removeCollection } = usePlannedCollectionMutations()
    const [removing, setRemoving] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)

    const plannedDate = parseIsoDate(item.plannedFor)
    const overdue = isOverdueDate(plannedDate, now)
    const heroImage = item.cocktails[0]?.cocktail?.imageUrl ?? '/placeholder.svg'
    const showPlannedTime = plannedDate.getHours() !== 12 || plannedDate.getMinutes() !== 0
    const formattedTime = plannedDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    })

    const openConfirm = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        setConfirmRemove(true)
    }

    const doRemove = async () => {
        setRemoving(true)
        try {
            await removeCollection.mutateAsync(item.id)
            toast.success('Collection removed')
            onUpdate()
        } catch {
            toast.error('Could not remove collection')
        } finally {
            setRemoving(false)
        }
    }

    return (
        <article
            className="group relative min-h-[112px] overflow-hidden rounded-2xl border border-fg/40 bg-surface-inverse cursor-pointer"
        >
            <Link href="/planner?view=collections" className="absolute inset-0 z-10" aria-label={`View ${item.title} in your planner`} />
            <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden">
                <Image
                    src={heroImage}
                    alt={item.title}
                    fill
                    sizes="(max-width: 1024px) 42vw, 20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-overlay/73 via-overlay/33 to-transparent" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between p-5 pr-[44%]">
                <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-fg-on-inverse/10 px-2.5 py-1 text-[10px] font-label uppercase tracking-widest text-fg-on-inverse backdrop-blur-sm">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-soft" />
                        Event
                    </span>
                    {overdue && (
                        <span className="rounded-full bg-danger-bg px-2 py-0.5 text-[10px] font-label uppercase tracking-wider text-danger">
                            Overdue
                        </span>
                    )}
                </div>

                <div className="mt-2">
                    <h3 className="line-clamp-1 font-headline text-lg leading-tight text-fg-on-inverse">
                        {item.title}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-on-inverse/90">
                        <CalendarDays size={12} aria-hidden="true" />
                        {formatMonthDay(plannedDate)}
                        {showPlannedTime && ` at ${formattedTime}`}
                        {' - '}
                        {relativeDateLabel(plannedDate, now, { eventStyle: true })}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-fg-on-inverse/85">
                        <Users size={11} aria-hidden="true" />
                        {item.servings} servings - {item.cocktails.length} cocktails
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={openConfirm}
                disabled={removing}
                className="absolute right-2 top-2 z-30 rounded-full bg-fg-on-image/12 p-1.5 text-fg-on-image/85 backdrop-blur-sm transition-colors hover:bg-danger-bg hover:text-danger disabled:opacity-50"
                aria-label={`Remove ${item.title} from planner`}
            >
                {removing ? <Loader2 size={14} aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Trash2 size={14} aria-hidden="true" />}
            </button>

            {confirmRemove && (
                <ConfirmDialog
                    title={`Delete "${item.title}"?`}
                    description="This event will be permanently removed."
                    confirmLabel="Delete"
                    onConfirm={() => { setConfirmRemove(false); void doRemove() }}
                    onCancel={() => setConfirmRemove(false)}
                />
            )}
        </article>
    )
}
