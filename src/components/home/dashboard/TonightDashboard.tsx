'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { useBestRatedMakeableQuery, useMakeableCocktailsQuery } from '@/hooks/queries/use-makeable'
import { usePantryQuery } from '@/hooks/queries/use-pantry'
import { usePlannedCocktailsQuery } from '@/hooks/queries/use-planned-cocktails'
import { usePlannedCollectionsQuery } from '@/hooks/queries/use-planned-collections'
import { useUserStatsQuery } from '@/hooks/queries/use-user-stats'
import type { MakeableCocktail } from '@/types/models/cocktail'
import type { UserPantryItem } from '@/types/models/pantry'
import Loader from "@/components/ui/Loader"
import { DashboardCocktailCard } from "@/components/home/dashboard/cards/DashboardCocktailCard"
import UpcomingCocktailsSection from '@/components/home/dashboard/UpcomingCocktailsSection'
import { useLiveNow } from '@/components/home/planned-cocktails/view/plannerViewHelpers'
import { selectUpcomingCocktails, selectUpcomingCollections } from '@/lib/planner-dashboard/plannerDashboardSelectors'
import { queryKeys } from '@/lib/query-keys'
import { MobileTopSearchBar } from '@/components/home/MobileTopSearchBar'
import { PackageOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

const LOW_THRESHOLDS: Record<string, number> = {
    cl: 10, ml: 500, oz: 3, g: 50, pcs: 2, zest: 2, slice: 2, twist: 2,
}

type StockStatus = 'ok' | 'low' | 'out' | 'inf'

function stockStatus(item: UserPantryItem): StockStatus {
    if (item.isInfinite) return 'inf'
    if (item.quantity === 0) return 'out'
    const t = LOW_THRESHOLDS[item.unitLeft] ?? 5
    return item.quantity <= t ? 'low' : 'ok'
}

const DOT_CLS: Record<StockStatus, string> = {
    ok:  'bg-status-ready-dot',
    low: 'bg-status-partial-dot',
    out: 'bg-danger',
    inf: 'bg-status-ready-dot'
}

function greeting(name?: string | null) {
    const h = new Date().getHours()
    const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
    return { tod, first: name?.split(' ')[0] ?? null }
}

export function TonightDashboard() {
    const { data: session }   = useSession()
    const { tod, first }      = greeting(session?.user?.name)
    const queryClient = useQueryClient()
    const now = useLiveNow()

    const { data: makeableData, isLoading } = useBestRatedMakeableQuery()
    const { cocktails: makeableList, loading: makeableListLoading } = useMakeableCocktailsQuery(3)
    const { data: pantryData }   = usePantryQuery()
    const { data: plannedData } = usePlannedCocktailsQuery({
        status: 'planned', limit: 1, sortBy: 'plannedFor', sortOrder: 'asc',
    })
    const { data: collectionsData } = usePlannedCollectionsQuery({
        status: 'planned', limit: 1, sortBy: 'plannedFor', sortOrder: 'asc',
    })
    const { data: plannedPreviewData } = usePlannedCocktailsQuery({
        status: 'planned', limit: 20, sortBy: 'plannedFor', sortOrder: 'asc',
    })
    const { data: collectionsPreviewData } = usePlannedCollectionsQuery({
        status: 'planned', limit: 20, sortBy: 'plannedFor', sortOrder: 'asc',
    })

    const { data: stats } = useUserStatsQuery()

    const makeables   = (makeableData ?? []) as MakeableCocktail[]
    const ready       = makeables.filter(c => c.makeableStatus === 'full').slice(0, 3)
    const almostThere = makeableList
        .filter(c => c.makeableStatus === 'missing' && (c.missingCount ?? 0) > 0 && (c.missingCount ?? 0) <= 2)
        .slice(0, 3)

    // Top 3 ingredients that each single-handedly unlock the most new cocktails
    const unlockData = useMemo(() => {
        const scores = new Map<string, { id: string; name: string; count: number }>()
        for (const c of makeableList) {
            if ((c.missingCount ?? 0) !== 1) continue
            for (const ing of (c.missingIngredients ?? [])) {
                const e = scores.get(ing.id)
                if (e) e.count++
                else scores.set(ing.id, { id: ing.id, name: ing.name, count: 1 })
            }
        }
        return [...scores.values()].sort((a, b) => b.count - a.count).slice(0, 3)
    }, [makeableList])
    const pantryItems = (pantryData?.items ?? []).filter(i => i.isInPantry).slice(0, 5)
    const plannedCocktailsCount = plannedData?.meta?.total ?? plannedData?.items?.length ?? 0
    const plannedCollectionsCount = collectionsData?.meta?.total
        ?? collectionsData?.items?.filter((item) => item.status === 'planned').length
        ?? 0
    const upcomingPlannerCocktails = useMemo(
        () => selectUpcomingCocktails(plannedPreviewData?.items ?? [], now, 2),
        [plannedPreviewData?.items, now],
    )
    const upcomingPlannerCollections = useMemo(
        () => selectUpcomingCollections(collectionsPreviewData?.items ?? [], now, 2),
        [collectionsPreviewData?.items, now],
    )

    const reloadPlannerHighlights = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.plannedCocktails.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.plannedCollections.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.makeable.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.userStats.all })
    }, [queryClient])

    let nextEvent   = collectionsData?.items?.[0]
    if (nextEvent && (nextEvent.plannedFor < new Date().toISOString() || nextEvent.completedAt != null)) {
        nextEvent = undefined
    }

    if (isLoading || makeableListLoading) {
        return (
            <div className="min-h-screen bg-canvas px-4 md:px-12 py-10">
                <Loader/>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-canvas">
            <MobileTopSearchBar />
            <div className="px-4 md:px-12 py-8 md:py-10">
            {/* Greeting row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-screen-xl mx-auto mb-10 gap-4">
                <div>
                    <h1 className="font-headline text-3xl lg:text-4xl text-fg leading-tight">
                        Good {tod}{first ? <>, <em className="text-brand-soft-strong not-italic">{first}.</em></> : '.'}
                    </h1>
                    <p className="text-fg-muted text-sm mt-1.5">
                        {makeables.length > 0
                            ? `${makeables.length} cocktail${makeables.length > 1 ? 's are' : ' is'} makeable with what you have tonight.`
                            : 'Add ingredients to your pantry to see what you can make.'}
                    </p>
                </div>
                <div className="flex gap-3 shrink-0">
                    <Link
                        href="/cocktails?onlyMakeable=true"
                        className="px-5 py-2.5 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand rounded-full text-sm font-label hover:opacity-80 transition-opacity"
                    >
                        Browse cocktails
                    </Link>
                </div>
            </div>


            <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

                {/* ── Left sidebar ───────────────────────────────── */}
                <aside className="flex flex-col gap-4">

                    {/* Pantry Pulse */}
                    <div className="bg-surface rounded-2xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-label text-[10px] uppercase tracking-widest text-fg">
                                Pantry Pulse
                            </span>
                            <Link href="/pantry" className="text-xs text-brand hover:text-brand-soft-strong font-medium transition-colors">
                                Manage →
                            </Link>
                        </div>
                        {pantryItems.length === 0 ? (
                            <EmptyState icon={PackageOpen} heading="Your pantry is empty." size="card" />
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {pantryItems.map(item => {
                                    const status = stockStatus(item)
                                    return (
                                        <div key={item.id} className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_CLS[status]}`} />
                                                <span className="text-sm text-fg truncate">
                                                    {item.ingredient?.name}
                                                </span>
                                            </div>
                                            <span className="text-xs text-fg-muted shrink-0 font-mono">
                                                {status === 'out'
                                                    ? '· out'
                                                  : status === 'inf'
                                                        ? 'No limit'
                                                    : status === 'low'
                                                        ? `${item.quantity} ${item.unitLeft} · low`
                                                        : `${item.quantity} ${item.unitLeft}`
                                                }
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Streak card */}
                    <div className="bg-surface-inverse rounded-2xl p-5 flex flex-col inset-ring-1 inset-ring-fg/40">
                        <span className="font-label text-[10px] uppercase tracking-widest text-fg-on-inverse/70 mb-3">
                            Current streak
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="font-headline text-5xl text-brand-soft italic leading-none">
                                {stats?.currentStreak ?? '—'}
                            </span>
                            <span className="font-headline text-2xl text-fg-on-inverse leading-none">
                                nights
                            </span>
                        </div>
                        {stats && stats.longestStreak > 0 && (
                            <p className="text-xs text-fg-on-inverse/70 mt-3">
                                Longest this year · {stats.longestStreak} nights
                            </p>
                        )}
                    </div>

                    {/* Next up */}
                    {nextEvent && (
                        <div className="bg-surface rounded-2xl p-5 shadow-xs">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-label text-[10px] uppercase tracking-widest text-fg-muted">
                                    Next Up
                                </span>
                                <Link href="/planner" className="text-xs text-brand-soft-strong hover:text-brand font-medium transition-colors">
                                    Planner
                                </Link>
                            </div>
                            <Link href="/planner" className="flex items-center gap-3 group">
                                <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-line">
                                    {nextEvent.cocktails?.[0]?.cocktail?.imageUrl && (
                                        <Image
                                            src={nextEvent.cocktails[0].cocktail.imageUrl}
                                            alt={nextEvent.title}
                                            fill
                                            className="object-cover"
                                            sizes="44px"
                                        />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-headline text-fg truncate group-hover:text-brand transition-colors">
                                        {nextEvent.title}
                                    </div>
                                    <div className="text-[11px] text-fg-muted mt-0.5">
                                        {new Date(nextEvent.plannedFor).toLocaleDateString('en-US', { weekday: 'long' })}
                                        {nextEvent.cocktails?.length > 0 && (
                                            <> · {nextEvent.cocktails.length} cocktail{nextEvent.cocktails.length > 1 ? 's' : ''}</>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    )}

                    <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-canvas to-surface-muted p-4">
                        <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-brand-soft/10 blur-2xl" />
                        <div className="relative">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <span className="font-label text-[10px] uppercase tracking-widest text-fg">
                                        Planner hub
                                    </span>
                                </div>
                                <Link href="/planner" className="text-xs text-brand hover:text-brand-soft-strong font-medium transition-colors">
                                    Open →
                                </Link>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <Link
                                    href="/planner?view=planned"
                                    className="group rounded-xl border border-line bg-surface/85 px-3 py-2.5 hover:bg-surface transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] uppercase tracking-widest text-fg-muted">Planned</p>
                                        <span className="h-1.5 w-1.5 rounded-full bg-brand-soft" />
                                    </div>
                                    <p className="mt-1 font-headline text-2xl leading-none text-fg">
                                        {plannedCocktailsCount}
                                    </p>
                                    <p className="mt-1 text-[10px] text-fg-muted">
                                        Cocktails
                                    </p>
                                </Link>
                                <Link
                                    href="/planner?view=collections"
                                    className="group rounded-xl border border-line bg-surface/85 px-3 py-2.5 hover:bg-surface transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] uppercase tracking-widest text-fg-muted">Events</p>
                                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                                    </div>
                                    <p className="mt-1 font-headline text-2xl leading-none text-fg">
                                        {plannedCollectionsCount}
                                    </p>
                                    <p className="mt-1 text-[10px] text-fg-muted">
                                        Not done
                                    </p>
                                </Link>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Main column ────────────────────────────────── */}
                <div className="flex flex-col gap-10">
                    {/* Ready right now */}
                    {ready.length > 0 && (
                        <section>
                            <div className="flex justify-between items-baseline mb-5">
                                <h2 className="font-headline text-xl lg:text-2xl text-fg">
                                    Ready right now
                                    <span className="ml-2 font-label text-[11px] text-fg-muted uppercase tracking-widest font-normal">
                                        · {makeables.length} {makeables.length === 1 ? 'drink' : 'drinks'}
                                    </span>
                                </h2>
                                <Link href="/cocktails?onlyMakeable=true" className="text-xs text-brand hover:text-brand-soft-strong font-medium transition-colors">
                                    View all →
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {ready.map(c => <DashboardCocktailCard key={c.id} cocktail={c} />)}
                            </div>
                        </section>
                    )}

                    <UpcomingCocktailsSection
                        now={now}
                        cocktailItems={upcomingPlannerCocktails}
                        collectionItems={upcomingPlannerCollections}
                        onUpdate={reloadPlannerHighlights}
                    />

                    {/* Almost there */}
                    {almostThere.length > 0 && (
                        <section>
                            <div className="flex justify-between items-baseline mb-5">
                                <h2 className="font-headline text-xl lg:text-2xl text-fg">
                                    Almost there
                                    <span className="ml-2 font-label text-[11px] text-fg-muted uppercase tracking-widest font-normal">
                                        · 1-2 ingredients away
                                    </span>
                                </h2>
                                <Link href="/cocktails" className="text-xs text-brand hover:text-brand-soft-strong font-medium transition-colors">
                                    View all →
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {almostThere.map(c => <DashboardCocktailCard key={c.id} cocktail={c} />)}
                            </div>
                        </section>
                    )}

                    {/* Unlock more drinks */}
                    {unlockData.length > 0 && (
                        <section>
                            <div className="flex justify-between items-baseline mb-5">
                                <h2 className="font-headline text-xl lg:text-2xl text-fg">
                                    Unlock more drinks
                                    <span className="ml-2 font-label text-[11px] text-fg-muted uppercase tracking-widest font-normal">
                                        · add one ingredient
                                    </span>
                                </h2>
                                <Link href="/pantry" className="text-xs text-brand hover:text-brand-soft-strong font-medium transition-colors">
                                    Go to pantry →
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {unlockData.map(ing => (
                                    <Link
                                        key={ing.id}
                                        href={`/ingredients/${ing.id}`}
                                        className="group bg-surface rounded-2xl p-5 border border-line hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
                                                <span className="font-headline italic text-lg text-brand-soft">
                                                    {ing.name.charAt(0)}
                                                </span>
                                            </div>
                                            <span className="font-label text-[10px] uppercase tracking-widest text-brand-soft-strong bg-surface-muted px-2.5 py-1 rounded-full">
                                                +{ing.count} {ing.count === 1 ? 'drink' : 'drinks'}
                                            </span>
                                        </div>
                                        <p className="font-semibold text-fg text-sm group-hover:text-brand transition-colors">
                                            {ing.name}
                                        </p>
                                        <p className="text-xs text-fg-muted mt-1">
                                            Unlocks {ing.count} new {ing.count === 1 ? 'cocktail' : 'cocktails'}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {ready.length === 0 && almostThere.length === 0 && (
                        <EmptyState
                            icon={PackageOpen}
                            heading="Nothing to make tonight"
                            body="Add ingredients to your pantry to discover what you can make."
                            action={
                                <Link href="/pantry" className="mt-2 px-8 py-3 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand text-sm font-label rounded-full hover:opacity-80 transition-opacity">
                                    Go to pantry
                                </Link>
                            }
                        />
                    )}
                </div>
            </div>
            </div>
        </div>
    )
}
