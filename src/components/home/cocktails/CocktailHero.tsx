'use client'

import Image from 'next/image'
import { CalendarDays, FlaskConical } from 'lucide-react'
import type { Session } from 'next-auth'
import StarRating, { StarRatingDisplay } from '@/components/StarRating'
import type { Cocktail } from '@/types/models/cocktail'

export type RatingStats = { avg: number | null; count: number }

export type PlanState = {
    exists:            boolean
    plannedCocktailId: string | null
    status:            'planned' | 'done' | null
    plannedFor:        string | null
}

interface CocktailHeroProps {
    cocktail:       Cocktail
    ratingStats:    RatingStats
    userRating:     number | null
    ratingLoading:  boolean
    onRate:         (value: number) => Promise<void>
    planState:      PlanState | null
    completing:     boolean
    onCompleted:    () => Promise<void>
    session:        Session | null
    onMake:         () => void
    onPlan:         () => void
}

function formatLabel(str: string) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function CocktailHero({
    cocktail,
    ratingStats,
    userRating,
    ratingLoading,
    onRate,
    planState,
    completing,
    onCompleted,
    session,
    onMake,
    onPlan,
}: CocktailHeroProps) {
    const tags = [
        ...(cocktail.flavors   ?? []),
        ...(cocktail.occasions ?? []),
        ...(cocktail.technique ?? []),
    ].map(formatLabel)

    return (
        <div className="relative flex flex-col justify-between p-14 text-fg-on-image bg-[linear-gradient(165deg,#2a1e12,#5a3820)] overflow-hidden">
            <div className="absolute right-[-120px] top-[-120px] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(216,150,90,0.55),transparent_60%)]" />

            {cocktail.imageUrl && (
                <Image
                    src={cocktail.imageUrl}
                    alt=""
                    fill
                    className="object-cover opacity-20"
                    priority
                />
            )}

            <div className="relative z-10 flex flex-col gap-6 h-full">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-fg-on-image/80 font-mono">
                        {cocktail.origin ?? cocktail.difficulty}
                    </p>
                    <h1 className="font-serif text-[64px] leading-none font-light tracking-[-0.02em] mt-3">
                        <em className="text-[#d9b384] not-italic">{cocktail.name}</em>
                    </h1>
                    {cocktail.description && (
                        <p className="mt-4 text-sm text-fg-on-image/90">{cocktail.description}</p>
                    )}
                </div>

                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {tags.slice(0, 6).map((t, i) => (
                            <span key={i} className="px-3 py-1 text-xs rounded-full bg-fg-on-image/10">{t}</span>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <StarRatingDisplay
                        avg={ratingStats.avg ?? 0}
                        count={ratingStats.count}
                        size={18}
                        textLight
                    />
                    {session?.user && (
                        <StarRating
                            value={userRating ?? 0}
                            size={18}
                            interactive={!ratingLoading}
                            onChange={onRate}
                        />
                    )}
                </div>

                <div className="flex gap-7 pt-5 border-t border-fg-on-image/15">
                    {cocktail.preparationTime && cocktail.preparationTime > 0 && (
                        <div>
                            <span className="text-[10px] uppercase text-fg-on-image/80 font-mono">Time</span>
                            <div className="font-serif text-xl">{cocktail.preparationTime} min</div>
                        </div>
                    )}
                    {cocktail.difficulty && (
                        <div>
                            <span className="text-[10px] uppercase text-fg-on-image/80 font-mono">Difficulty</span>
                            <div className="font-serif text-xl">{formatLabel(cocktail.difficulty)}</div>
                        </div>
                    )}
                </div>

                {planState?.exists && (
                    <div className="text-sm text-fg-on-image/90 flex items-center gap-2">
                        {planState.status === 'planned' && <><CalendarDays size={13} /> Planned</>}
                        {planState.status === 'done'    && <>✓ Done</>}
                    </div>
                )}

                {session?.user && (
                    <>
                        <div className="hidden md:flex flex-col md:flex-row gap-3 mt-auto pt-6 border-t border-fg-on-image/15">
                            <button
                                onClick={onMake}
                                className="px-6 py-3 rounded-full bg-fg-on-image text-surface-inverse flex items-center gap-2 hover:bg-fg-on-image/90"
                            >
                                <FlaskConical size={15} /> Make now
                            </button>
                            <button
                                onClick={onPlan}
                                className="px-6 py-3 rounded-full border border-fg-on-image/30 flex items-center gap-2 hover:bg-fg-on-image/10"
                            >
                                <CalendarDays size={15} /> Plan
                            </button>
                            {planState?.status === 'planned' && (
                                <button
                                    onClick={onCompleted}
                                    disabled={completing}
                                    className="px-6 py-3 rounded-full border border-fg-on-image/30 hover:bg-fg-on-image/10 flex items-center gap-2"
                                >
                                    {completing ? 'Saving…' : 'Mark done'}
                                </button>
                            )}
                        </div>

                        {planState?.status === 'planned' && (
                            <button
                                onClick={onCompleted}
                                disabled={completing}
                                className="md:hidden mt-2 px-4 py-2 rounded-full border border-fg-on-image/30 hover:bg-fg-on-image/10 flex items-center gap-2 w-fit"
                            >
                                {completing ? 'Saving…' : 'Mark done'}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
