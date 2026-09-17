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
            className="group relative min-h-[112px] overflow-hidden rounded-2xl border border-[#2e2f2c] bg-mg-ink cursor-pointer"
        >
            <Link href="/planner?view=collections" className="absolute inset-0 z-10" aria-label="View planned collections" />
            <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden">
                <Image
                    src={heroImage}
                    alt={item.title}
                    fill
                    sizes="(max-width: 1024px) 42vw, 20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-mg-ink/55 via-mg-ink/25 to-transparent" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between p-5 pr-[44%]">
                <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-label uppercase tracking-widest text-white backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-mg-caramel" />
                        Event
                    </span>
                    {overdue && (
                        <span className="rounded-full bg-mg-danger-light px-2 py-0.5 text-[10px] font-label uppercase tracking-wider text-mg-danger">
                            Overdue
                        </span>
                    )}
                </div>

                <div className="mt-2">
                    <h3 className="line-clamp-1 font-headline text-lg leading-tight text-white">
                        {item.title}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-white/90">
                        <CalendarDays size={12} />
                        {formatMonthDay(plannedDate)}
                        {showPlannedTime && ` at ${formattedTime}`}
                        {' - '}
                        {relativeDateLabel(plannedDate, now, { eventStyle: true })}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/85">
                        <Users size={11} />
                        {item.servings} servings - {item.cocktails.length} cocktails
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={openConfirm}
                disabled={removing}
                className="absolute right-2 top-2 z-30 rounded-full bg-white/12 p-1.5 text-white/85 backdrop-blur-sm transition-colors hover:bg-mg-danger-light hover:text-mg-danger disabled:opacity-50"
                aria-label="Remove from planner"
            >
                {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
