'use client'

import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import type { IngredientStatusInfo } from '@/hooks/useCocktailIngredientPantry'
import type { PlannedCocktail } from '@/types/models/planned-cocktail'
import type { PlannedCollection } from '@/types/models/planned-collection'
import UpcomingCocktailCard from '@/components/home/dashboard/cards/UpcomingCocktailCard'
import UpcomingCollectionCard from '@/components/home/dashboard/cards/UpcomingCollectionCard'

interface UpcomingCocktailsSectionProps {
    now: Date
    cocktailItems: PlannedCocktail[]
    collectionItems: PlannedCollection[]
    onUpdate: () => void
    getIngredientStatus?: (id: string) => IngredientStatusInfo
}

export default function UpcomingCocktailsSection({
    now,
    cocktailItems,
    collectionItems,
    onUpdate,
    getIngredientStatus,
}: UpcomingCocktailsSectionProps) {
    const hasItems = cocktailItems.length > 0 || collectionItems.length > 0

    return (
        <section className="space-y-4">
            <div className="flex items-end justify-between gap-3">
                <h2 className="font-headline text-xl lg:text-2xl text-fg">Upcoming cocktails and collections</h2>
                <Link
                    href="/planner"
                    className="text-xs text-brand hover:text-brand-soft-strong font-medium transition-colors"
                >
                    View all →
                </Link>
            </div>

            {!hasItems ? (
                <div className="flex flex-col items-center text-center py-14 gap-3">
                    <div className="w-14 h-14 rounded-full bg-brand-soft/12 flex items-center justify-center">
                        <CalendarClock size={26} className="text-brand" />
                    </div>
                    <p className="font-headline italic text-lg text-fg leading-tight">
                        Nothing on the agenda
                    </p>
                    <p className="text-xs text-fg-muted max-w-xs">
                        Plan a cocktail or build a collection and it&apos;ll appear here.
                    </p>
                    <Link
                        href="/cocktails"
                        className="mt-2 px-6 py-2 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand rounded-full font-label text-[11px] uppercase tracking-widest hover:scale-[0.98] transition-transform duration-200"
                    >
                        Browse cocktails
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {cocktailItems.map((item) => (
                        <UpcomingCocktailCard
                            key={item.id}
                            item={item}
                            now={now}
                            onUpdate={onUpdate}
                            getIngredientStatus={getIngredientStatus}
                        />
                    ))}
                    {collectionItems.map((item) => (
                        <UpcomingCollectionCard
                            key={item.id}
                            item={item}
                            now={now}
                            onUpdate={onUpdate}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
