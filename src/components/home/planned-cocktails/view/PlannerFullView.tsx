'use client'

import { useState } from 'react'
import { PlusIcon, CalendarDays, ChevronDown, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import SmartCollectionsSection from '@/components/home/planned-cocktails/view/SmartCollectionsSection'
import PlannedCocktailCard from '@/components/home/planned-cocktails/card/PlannedCocktailCard'
import PlannedCollectionCard from '@/components/home/planned-cocktails/card/PlannedCollectionCard'
import RecentMadeCard from '@/components/home/planned-cocktails/card/RecentMadeCard'
import PlannerViewTabs from '@/components/home/planned-cocktails/view/PlannerViewTabs'
import PlannerCalendarView from '@/components/home/planned-cocktails/view/PlannerCalendarView'
import MyRsvpsSection from '@/components/home/planned-cocktails/view/MyRsvpsSection'
import Loader from '@/components/ui/Loader'
import { useAutoLoadMore } from '@/hooks/use-auto-load-more'
import type { IngredientStatusInfo } from '@/hooks/useCocktailIngredientPantry'
import type { CocktailDayGroup, PlannerView } from '@/components/home/planned-cocktails/view/plannerViewHelpers'
import type { PlannedCocktail } from '@/types/models/planned-cocktail'
import type { PlannedCollection } from '@/types/models/planned-collection'
import type { CocktailMadeLog } from '@/types/models/cocktail-made-log'
import { formatDayName, formatMonthDay, relativeDateLabel } from '@/lib/planner-dashboard/plannerDateUtils'
import Link from 'next/link'

interface PlannerFullViewProps {
    view: PlannerView
    now: Date
    heading: string
    subtitle: string
    loading: boolean
    plannedOverdueGroups: CocktailDayGroup[]
    plannedComingGroups: CocktailDayGroup[]
    sortedMade: CocktailMadeLog[]
    sortedCollectionsOverdue: PlannedCollection[]
    sortedCollectionsActive: PlannedCollection[]
    sortedCollectionsFinished: PlannedCollection[]
    calendarPlanned: PlannedCocktail[]
    calendarCollections: PlannedCollection[]
    calendarMade: CocktailMadeLog[]
    plannedTotal: number
    plannedOverdueTotal: number
    plannedOverdueCount: number
    plannedComingTotal: number
    plannedComingCount: number
    madeTotal: number
    madeCount: number
    collectionsOverdueTotal: number
    collectionsOverdueCount: number
    collectionsActiveTotal: number
    collectionsActiveCount: number
    collectionsFinishedTotal: number
    collectionsFinishedCount: number
    collectionsTabCount: number
    getIngredientStatus?: (id: string) => IngredientStatusInfo
    onUpdate: () => void
    onRemoveMadeLog: (id: string) => Promise<void>
    onOpenCreateCollection: () => void
    onOpenCreateCollectionWithDate?: (dateStr: string) => void
    onLoadMorePlannedOverdue: () => void
    onLoadMorePlannedComing: () => void
    onLoadMoreMade: () => void
    onLoadMoreCollectionsOverdue: () => void
    onLoadMoreCollectionsActive: () => void
    onLoadMoreCollectionsFinished: () => void
    isFetchingMade: boolean
    isFetchingPlannedOverdue: boolean
    isFetchingPlannedComing: boolean
    isFetchingCollectionsOverdue: boolean
    isFetchingCollectionsActive: boolean
    isFetchingCollectionsFinished: boolean
}

const SECTION_TITLE_CLASS = 'font-headline text-2xl text-mg-ink'
const SUBSECTION_TITLE_CLASS = 'font-headline text-xl text-mg-ink'
const DANGER_SECTION_TITLE_CLASS = 'font-headline text-2xl text-mg-danger'

function LoadMoreButton({
    onClick,
    isLoading = false,
}: {
    onClick: () => void
    isLoading?: boolean
}) {
    const loadMoreRef = useAutoLoadMore({
        enabled: true,
        isLoading,
        onLoadMore: onClick,
    })

    return (
        <div ref={loadMoreRef} className="mt-5 flex min-h-10 justify-center" aria-live="polite">
            {isLoading && <Loader variant="spinner" />}
        </div>
    )
}

function SkeletonLine({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-full bg-mg-sand/60 ${className}`} />
}

function CocktailCardSkeleton() {
    return (
        <article className="max-w-xl overflow-hidden rounded-2xl bg-white shadow-xs">
            <div className="flex min-h-[148px]">
                <div className="w-32 shrink-0 animate-pulse bg-mg-sand sm:w-40" />
                <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 pr-8 sm:p-4 sm:pr-14">
                    <div className="flex gap-2">
                        <SkeletonLine className="h-5 w-16" />
                        <SkeletonLine className="h-5 w-10" />
                    </div>
                    <SkeletonLine className="h-6 w-3/4" />
                    <SkeletonLine className="h-4 w-2/3" />
                    <SkeletonLine className="h-4 w-1/2" />
                    <div className="mt-auto flex justify-end">
                        <SkeletonLine className="h-8 w-24" />
                    </div>
                </div>
            </div>
        </article>
    )
}

function CollectionCardSkeleton() {
    return (
        <article className="overflow-hidden rounded-xl bg-white shadow-xs">
            <div className="h-28 animate-pulse bg-mg-sand" />
            <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                    <SkeletonLine className="h-6 w-2/3" />
                    <SkeletonLine className="h-5 w-16" />
                </div>
                <SkeletonLine className="h-4 w-1/2" />
                <SkeletonLine className="h-4 w-1/3" />
                <div className="flex gap-2 pt-2">
                    <SkeletonLine className="h-9 flex-1" />
                    <SkeletonLine className="h-9 flex-1" />
                </div>
            </div>
        </article>
    )
}

function MadeCardSkeleton() {
    return (
        <article className="rounded-2xl border border-mg-sand bg-white">
            <div className="flex items-start gap-3">
                <div className="h-24 w-24 shrink-0 animate-pulse rounded-l-xl bg-mg-sand" />
                <div className="min-w-0 flex-1 space-y-3 p-3">
                    <SkeletonLine className="h-6 w-3/4" />
                    <SkeletonLine className="h-4 w-1/2" />
                </div>
            </div>
        </article>
    )
}

function CalendarSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-mg-sand bg-white p-3">
                <div className="flex items-center gap-2">
                    <SkeletonLine className="h-8 w-16" />
                    <SkeletonLine className="h-8 w-8" />
                    <SkeletonLine className="h-8 w-8" />
                    <SkeletonLine className="ml-2 h-7 w-44" />
                </div>
                <SkeletonLine className="h-9 w-72" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-mg-sand bg-white">
                <div className="grid grid-cols-7 border-b border-mg-sand bg-mg-cream">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="py-2">
                            <SkeletonLine className="mx-auto h-3 w-8" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="min-h-[92px] border-r border-b border-mg-sand p-2">
                            <SkeletonLine className="h-5 w-5" />
                            <SkeletonLine className="mt-3 h-5 w-full" />
                            {i % 3 === 0 && <SkeletonLine className="mt-2 h-5 w-2/3" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function PlannerLoadingState({ view }: { view: PlannerView }) {
    if (view === 'calendar') return <CalendarSkeleton />

    if (view === 'collections') {
        return (
            <div className="flex items-start gap-6">
                <aside className="hidden w-72 shrink-0 space-y-3 lg:block">
                    <SkeletonLine className="h-7 w-28" />
                    <div className="space-y-2">
                        <MadeCardSkeleton />
                        <MadeCardSkeleton />
                    </div>
                </aside>
                <div className="min-w-0 flex-1 space-y-6">
                    <SkeletonLine className="h-8 w-36" />
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => <CollectionCardSkeleton key={i} />)}
                    </div>
                </div>
            </div>
        )
    }

    const count = view === 'made' ? 4 : 6
    const Card = view === 'made' ? MadeCardSkeleton : CocktailCardSkeleton

    return (
        <div className="space-y-4">
            <SkeletonLine className="h-8 w-32" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Array.from({ length: count }).map((_, i) => <Card key={i} />)}
            </div>
        </div>
    )
}

function CocktailGroups({
    groups,
    now,
    onUpdate,
    getIngredientStatus,
    forceOverdue = false,
}: {
    groups: CocktailDayGroup[]
    now: Date
    onUpdate: () => void
    getIngredientStatus?: (id: string) => IngredientStatusInfo
    forceOverdue?: boolean
}) {
    return (
        <div className="space-y-4">
            {groups.map((group) => {
                return (
                    <section key={group.key} className="p-1 md:p-5">
                        <h3 className={SUBSECTION_TITLE_CLASS}>{formatDayName(group.date)}</h3>
                        <p className={`mt-1 text-xs ${forceOverdue ? 'text-mg-danger' : 'text-mg-muted'}`}>
                            {formatMonthDay(group.date)} - {relativeDateLabel(group.date, now, { eventStyle: true })}
                        </p>

                        <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {group.items.map((item) => (
                                    <PlannedCocktailCard
                                        key={item.id}
                                        item={item}
                                        now={now}
                                        onUpdate={onUpdate}
                                        getIngredientStatus={getIngredientStatus}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                )
            })}
        </div>
    )
}

export default function PlannerFullView({
    view,
    now,
    heading,
    subtitle,
    loading,
    plannedOverdueGroups,
    plannedComingGroups,
    sortedMade,
    sortedCollectionsOverdue,
    sortedCollectionsActive,
    sortedCollectionsFinished,
    calendarPlanned,
    calendarCollections,
    calendarMade,
    plannedTotal,
    plannedOverdueTotal,
    plannedOverdueCount,
    plannedComingTotal,
    plannedComingCount,
    madeTotal,
    madeCount,
    collectionsOverdueTotal,
    collectionsOverdueCount,
    collectionsActiveTotal,
    collectionsActiveCount,
    collectionsFinishedTotal,
    collectionsFinishedCount,
    collectionsTabCount,
    getIngredientStatus,
    onUpdate,
    onRemoveMadeLog,
    onOpenCreateCollection,
    onOpenCreateCollectionWithDate,
    onLoadMorePlannedOverdue,
    onLoadMorePlannedComing,
    onLoadMoreMade,
    onLoadMoreCollectionsOverdue,
    onLoadMoreCollectionsActive,
    onLoadMoreCollectionsFinished,
    isFetchingMade,
    isFetchingPlannedOverdue,
    isFetchingPlannedComing,
    isFetchingCollectionsOverdue,
    isFetchingCollectionsActive,
    isFetchingCollectionsFinished,
}: PlannerFullViewProps) {
    const [bulkMode, setBulkMode] = useState(false)
    const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())

  const toggleBulkSelect = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

    const handleBulkRemove = async () => {
        const ids = Array.from(bulkSelected)
        setBulkSelected(new Set())
        setBulkMode(false)
        await Promise.all(ids.map(id => onRemoveMadeLog(id)))
    }

    const showAddCollectionAction = view === 'collections'
    const hasAnyPlanned = plannedOverdueGroups.length > 0 || plannedComingGroups.length > 0
    const hasAnyCollections =
        sortedCollectionsOverdue.length > 0 ||
        sortedCollectionsActive.length > 0 ||
        sortedCollectionsFinished.length > 0
    const hasMorePlannedOverdue = plannedOverdueTotal > plannedOverdueCount
    const hasMorePlannedComing = plannedComingTotal > plannedComingCount
    const hasMoreMade = madeTotal > madeCount
    const hasMoreCollectionsOverdue = collectionsOverdueTotal > collectionsOverdueCount
    const hasMoreCollectionsActive = collectionsActiveTotal > collectionsActiveCount
    const hasMoreCollectionsFinished = collectionsFinishedTotal > collectionsFinishedCount

    return (
        <>
        <div className="min-h-screen bg-mg-cream pb-16">
            <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
                <div className="mb-5 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0 max-w-2xl">
                            <h1 className="font-headline text-3xl md:text-4xl text-mg-ink">{heading}</h1>
                            <p className="mt-1 text-sm text-mg-muted">{subtitle}</p>
                        </div>

                        {showAddCollectionAction && (
                            <button
                                type="button"
                                onClick={onOpenCreateCollection}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-mg-bone bg-white px-4 py-2 text-xs font-label uppercase tracking-widest text-mg-charcoal transition-colors hover:bg-mg-haze"
                            >
                                <PlusIcon className="h-4 w-4" />
                                New event
                            </button>
                        )}
                    </div>

                    <PlannerViewTabs
                        activeView={view}
                        plannedCount={plannedTotal}
                        madeCount={madeTotal}
                        collectionsCount={collectionsTabCount}
                    />
                </div>
                {loading ? (
                    <PlannerLoadingState view={view} />
                ) : view === 'calendar' ? (
                    <PlannerCalendarView
                        now={now}
                        plannedItems={calendarPlanned}
                        collections={calendarCollections}
                        madeLogs={calendarMade}
                        onUpdate={onUpdate}
                        onOpenCreateCollection={onOpenCreateCollection}
                        onClickEmptyCell={onOpenCreateCollectionWithDate}
                        getIngredientStatus={getIngredientStatus}
                    />
                ) : view === 'planned' ? (
                    <div className="space-y-6">
                        {!hasAnyPlanned ? (
                            <PlannerEmptyState view={view} hasSearch={false} onOpenCreateCollection={onOpenCreateCollection} />
                        ) : (
                            <>
                                {plannedOverdueGroups.length > 0 && (
                                    <section className="space-y-3">
                                        <h2 className={DANGER_SECTION_TITLE_CLASS}>Overdue</h2>
                                        <CocktailGroups
                                            groups={plannedOverdueGroups}
                                            now={now}
                                            onUpdate={onUpdate}
                                            getIngredientStatus={getIngredientStatus}
                                            forceOverdue
                                        />
                                        {hasMorePlannedOverdue && (
                                            <LoadMoreButton onClick={onLoadMorePlannedOverdue} isLoading={isFetchingPlannedOverdue} />
                                        )}
                                    </section>
                                )}

                                <section className="space-y-3 ">
                                    {plannedComingGroups.length > 0 && (
                                        <CocktailGroups
                                            groups={plannedComingGroups}
                                            now={now}
                                            onUpdate={onUpdate}
                                            getIngredientStatus={getIngredientStatus}
                                        />
                                        )}
                                    {hasMorePlannedComing && (
                                        <LoadMoreButton onClick={onLoadMorePlannedComing} isLoading={isFetchingPlannedComing} />
                                    )}
                                </section>
                            </>
                        )}
                    </div>
                ) : view === 'made' ? (
                    <div className="space-y-4">
                        {sortedMade.length === 0 ? (
                            <PlannerEmptyState view={view} hasSearch={false} onOpenCreateCollection={onOpenCreateCollection} />
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-mg-muted">{madeTotal} entries</p>
                                    <button
                                        type="button"
                                        onClick={() => { setBulkMode(m => !m); setBulkSelected(new Set()) }}
                                        className="text-xs font-label uppercase tracking-widest text-mg-muted hover:text-mg-brown transition-colors"
                                    >
                                        {bulkMode ? 'Cancel' : 'Select'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {sortedMade.map((item) => (
                                        <RecentMadeCard
                                            key={item.id}
                                            item={item}
                                            onRemove={onRemoveMadeLog}
                                            selectable={bulkMode}
                                            selected={bulkSelected.has(item.id)}
                                            onSelect={() => toggleBulkSelect(item.id)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {hasMoreMade && (
                            <LoadMoreButton onClick={onLoadMoreMade} isLoading={isFetchingMade} />
                        )}
                    </div>
                ) : view === 'collections' ? (
                    <div className="flex gap-6 items-start">
                        {/* RSVPs sidebar (desktop) */}
                        <aside className="hidden lg:block w-72 shrink-0 space-y-3">
                            <h2 className={SECTION_TITLE_CLASS}>My RSVPs</h2>
                            <MyRsvpsSection />
                        </aside>
                        {/* Main events column */}
                        <div className="flex-1 min-w-0 space-y-6">
                            {/* RSVPs collapsible (mobile / tablet) */}
                            <details className="lg:hidden group rounded-2xl border border-mg-sand bg-white overflow-hidden">
                                <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4">
                                    <span className={SUBSECTION_TITLE_CLASS}>My RSVPs</span>
                                    <ChevronDown size={16} className="text-mg-muted transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="px-5 pb-4">
                                    <MyRsvpsSection />
                                </div>
                            </details>
                            {!hasAnyCollections ? (
                                <div className="space-y-8">
                                    <SmartCollectionsSection asCta onCreated={onUpdate} />
                                    <PlannerEmptyState
                                        view={view}
                                        hasSearch={false}
                                        onOpenCreateCollection={onOpenCreateCollection}
                                    />
                                </div>
                            ) : (
                                <>
                                    {sortedCollectionsOverdue.length > 0 && (
                                        <section className="space-y-3">
                                            <h2 className={DANGER_SECTION_TITLE_CLASS}>Overdue</h2>
                                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                                {sortedCollectionsOverdue.map((item) => (
                                                    <PlannedCollectionCard key={item.id} item={item} now={now} onUpdate={onUpdate} />
                                                ))}
                                            </div>
                                            {hasMoreCollectionsOverdue && (
                                                <LoadMoreButton onClick={onLoadMoreCollectionsOverdue} isLoading={isFetchingCollectionsOverdue} />
                                            )}
                                        </section>
                                    )}

                                    <section className="space-y-3">
                                        <h2 className={SECTION_TITLE_CLASS}>Coming up</h2>
                                        {sortedCollectionsActive.length === 0 ? (
                                            <EmptyState
                                                icon={CalendarDays}
                                                heading="No upcoming events"
                                                body="Plan one and it'll show up here."
                                                size="section"
                                            />
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                                {sortedCollectionsActive.map((item) => (
                                                    <PlannedCollectionCard key={item.id} item={item} now={now} onUpdate={onUpdate} />
                                                ))}
                                            </div>
                                        )}
                                        {hasMoreCollectionsActive && (
                                            <LoadMoreButton onClick={onLoadMoreCollectionsActive} isLoading={isFetchingCollectionsActive} />
                                        )}
                                    </section>

                                    {(sortedCollectionsFinished.length > 0 || hasMoreCollectionsFinished) && (
                                        <section className="space-y-3">
                                            <h2 className={SECTION_TITLE_CLASS}>Already made</h2>
                                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                                {sortedCollectionsFinished.map((item) => (
                                                    <PlannedCollectionCard
                                                        key={item.id}
                                                        item={item}
                                                        now={now}
                                                        onUpdate={onUpdate}
                                                    />
                                                ))}
                                            </div>
                                            {hasMoreCollectionsFinished && (
                                                <LoadMoreButton
                                                    onClick={onLoadMoreCollectionsFinished}
                                                    isLoading={isFetchingCollectionsFinished}
                                                />
                                            )}
                                        </section>
                                    )}

                                    <SmartCollectionsSection onCreated={onUpdate} />
                                </>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>

        {/* Bulk action bar */}
        {bulkMode && bulkSelected.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-mg-ink text-white rounded-full shadow-xl">
                <span className="text-xs font-label uppercase tracking-widest">{bulkSelected.size} selected</span>
                <button
                    type="button"
                    onClick={() => void handleBulkRemove()}
                    className="flex items-center gap-1.5 text-xs font-label uppercase tracking-widest text-mg-danger-light hover:text-red-300 transition-colors"
                >
                    <Trash2 size={12} />
                    Delete all
                </button>
            </div>
        )}
        </>
    )
}

/* Empty state */
function PlannerEmptyState({
    view,
    hasSearch,
    onOpenCreateCollection,
}: {
    view: PlannerView
    hasSearch: boolean
    onOpenCreateCollection?: () => void
}) {
    if (hasSearch) {
        return (
            <EmptyState
                icon={CalendarDays}
                heading="No cocktails match your search."
                size="page"
            />
        )
    }

    const heading = view === 'planned'
        ? 'Nothing planned yet'
        : view === 'made'
            ? 'No cocktails marked as done yet'
            : 'No events planned yet'

    const body = view === 'collections'
        ? "Build an event or themed list and it'll appear here."
        : "Plan a cocktail and it'll appear here."

    const action = view === 'collections' ? (
        <button
            type="button"
            onClick={onOpenCreateCollection}
            className="mt-2 px-8 py-3 bg-gradient-to-br from-mg-brown to-mg-caramel text-white rounded-full font-label text-xs uppercase tracking-widest hover:scale-[0.98] transition-transform duration-200"
        >
            New event
        </button>
    ) : (
        <Link
            href="/cocktails"
            className="mt-2 px-8 py-3 bg-gradient-to-br from-mg-brown to-mg-caramel text-white rounded-full font-label text-xs uppercase tracking-widest hover:scale-[0.98] transition-transform duration-200"
        >
            Browse cocktails
        </Link>
    )

    return <EmptyState icon={CalendarDays} heading={heading} body={body} action={action} />
}
