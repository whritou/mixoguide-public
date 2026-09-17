'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePlannedCocktailMutations } from '@/hooks/mutations/use-planned-cocktail-mutations'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { IngredientStatusInfo } from '@/hooks/useCocktailIngredientPantry'
import type { PlannedCocktail } from '@/types/models/planned-cocktail'
import {
    formatMonthDay,
    isOverdueDate,
    parseIsoDate,
    relativeDateLabel,
} from '@/lib/planner-dashboard/plannerDateUtils'

interface UpcomingCocktailCardProps {
    item: PlannedCocktail
    now: Date
    onUpdate: () => void
    getIngredientStatus?: (id: string) => IngredientStatusInfo
}

function statusBadge(item: PlannedCocktail, isReady: boolean, missingCount: number, inListCount: number) {
    if (isReady) return { label: 'READY', dot: 'bg-emerald-400' }
    if (missingCount === 0 && inListCount > 0) return { label: 'IN LIST', dot: 'bg-amber-400' }
    if (item.cocktail?.ingredients?.[0]?.ingredient?.name) {
        return { label: `NEED ${item.cocktail.ingredients[0].ingredient.name.toUpperCase()}`, dot: 'bg-orange-400' }
    }
    return { label: 'MISSING', dot: 'bg-orange-400' }
}

export default function UpcomingCocktailCard({
    item,
    now,
    onUpdate,
    getIngredientStatus,
}: UpcomingCocktailCardProps) {
    const { remove } = usePlannedCocktailMutations()
    const [removing, setRemoving] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)

    const plannedDate = parseIsoDate(item.plannedFor)
    const overdue = isOverdueDate(plannedDate, now)
    const ingredients = useMemo(() => item.cocktail?.ingredients ?? [], [item.cocktail?.ingredients])

    const ingredientCounts = useMemo(() => {
        let inPantryCount = 0
        let inListCount = 0
        let missingCount = 0

        for (const ingredient of ingredients) {
            const status = getIngredientStatus?.(ingredient.ingredientId)
            if (!status) continue
            if (status.inPantry) inPantryCount += 1
            else if (status.inWishlist) inListCount += 1
            else missingCount += 1
        }

        return { inPantryCount, inListCount, missingCount }
    }, [getIngredientStatus, ingredients])

    const isReady = ingredients.length > 0 && ingredientCounts.inPantryCount === ingredients.length
    const badge = statusBadge(item, isReady, ingredientCounts.missingCount, ingredientCounts.inListCount)

    const openConfirm = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        setConfirmRemove(true)
    }

    const doRemove = async () => {
        setRemoving(true)
        try {
            await remove.mutateAsync(item.id)
            toast.success('Removed from planner')
            onUpdate()
        } catch {
            toast.error('Could not remove cocktail')
        } finally {
            setRemoving(false)
        }
    }

    return (
        <article
            className="group relative min-h-[112px] overflow-hidden rounded-2xl border border-[#e8e3dc] bg-white cursor-pointer"
        >
            <Link href="/planner?view=planned" className="absolute inset-0 z-10" aria-label="View planned cocktails" />
            <div className="absolute inset-y-0 right-0 w-[38%] overflow-hidden">
                <Image
                    src={item.cocktail?.imageUrl ?? '/placeholder.svg'}
                    alt={item.cocktail?.name ?? 'Cocktail'}
                    fill
                    sizes="(max-width: 1024px) 40vw, 18vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-mg-ink/25 via-mg-ink/5 to-transparent" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between p-5 pr-[40%]">
                <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-mg-ink/75 px-2.5 py-1 text-[10px] font-label uppercase tracking-widest text-white backdrop-blur-sm">
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                    </span>
                    {overdue && (
                        <span className="rounded-full bg-mg-danger-light px-2 py-0.5 text-[10px] font-label uppercase tracking-wider text-mg-danger">
                            Overdue
                        </span>
                    )}
                </div>

                <div className="mt-2">
                    <h3 className="line-clamp-1 font-headline text-lg leading-tight text-mg-ink">
                        {item.cocktail?.name ?? '-'}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-mg-muted">
                        <CalendarDays size={12} />
                        {formatMonthDay(plannedDate)} - {relativeDateLabel(plannedDate, now, { eventStyle: true })}
                    </p>
                    {item.quantity > 1 && (
                        <p className="mt-1 text-[11px] text-mg-muted">
                            {item.quantity} servings
                        </p>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={openConfirm}
                disabled={removing}
                className="absolute right-2 top-2 z-30 rounded-full bg-white/85 p-1.5 text-mg-muted backdrop-blur-sm transition-colors hover:bg-mg-danger-light hover:text-mg-danger disabled:opacity-50"
                aria-label="Remove from planner"
            >
                {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>

            {confirmRemove && (
                <ConfirmDialog
                    title="Remove from planner?"
                    description={`"${item.cocktail?.name ?? 'This cocktail'}" will be removed from your plan.`}
                    confirmLabel="Remove"
                    onConfirm={() => { setConfirmRemove(false); void doRemove() }}
                    onCancel={() => setConfirmRemove(false)}
                />
            )}
        </article>
    )
}
