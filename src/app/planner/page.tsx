'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import CreatePlannedCollectionDialog from '@/components/home/planned-cocktails/dialog/CreatePlannedCollectionDialog'
import PlannerFullView from '@/components/home/planned-cocktails/view/PlannerFullView'
import {
    normalizePlannerView,
    useLiveNow,
} from '@/components/home/planned-cocktails/view/plannerViewHelpers'

import { usePlannedCocktailsQuery } from '@/hooks/queries/use-planned-cocktails'
import { useCocktailMadeLogsQuery } from '@/hooks/queries/use-cocktail-made-logs'
import { usePlannedCollectionsQuery } from '@/hooks/queries/use-planned-collections'
import { useCocktailIngredientPantry } from '@/hooks/useCocktailIngredientPantry'
import { useCocktailMadeLogMutations } from '@/hooks/mutations/use-cocktail-made-log-mutations'
import {
    groupPlannedCocktailsByDay,
    selectSortedCollectionsByPlannedFor,
    selectSortedFinishedCollections,
    selectSortedMadeLogs,
} from '@/lib/planner-dashboard/plannerDashboardSelectors'
import { queryKeys } from '@/lib/query-keys'

const PAGE_SIZE_MADE = 20
const PAGE_SIZE_PLANNED_OVERDUE = 10
const PAGE_SIZE_PLANNED_COMING = 20
const PAGE_SIZE_COLLECTIONS_OVERDUE = 10
const PAGE_SIZE_COLLECTIONS_ACTIVE = 20
const PAGE_SIZE_COLLECTIONS_FINISHED = 10
const CALENDAR_LIMIT = 200

export default function PlannerPage() {
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const now = useLiveNow()

    const [showCreateCollection, setShowCreateCollection] = useState(false)
    const [quickCreateDate, setQuickCreateDate] = useState<string | undefined>(undefined)

    const [limitMade, setLimitMade] = useState(PAGE_SIZE_MADE)
    const [limitPlannedOverdue, setLimitPlannedOverdue] = useState(PAGE_SIZE_PLANNED_OVERDUE)
    const [limitPlannedComing, setLimitPlannedComing] = useState(PAGE_SIZE_PLANNED_COMING)
    const [limitCollectionsOverdue, setLimitCollectionsOverdue] = useState(PAGE_SIZE_COLLECTIONS_OVERDUE)
    const [limitCollectionsActive, setLimitCollectionsActive] = useState(PAGE_SIZE_COLLECTIONS_ACTIVE)
    const [limitCollectionsFinished, setLimitCollectionsFinished] = useState(PAGE_SIZE_COLLECTIONS_FINISHED)

    const view = normalizePlannerView(searchParams.get('view'))
    const isCalendar    = view === 'calendar'
    const isPlanned     = view === 'planned'     || isCalendar
    const isMade        = view === 'made'        || isCalendar
    const isCollections = view === 'collections' || isCalendar

    const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
    const dayStartIso = useMemo(() => {
        const [year, month, day] = dayKey.split('-').map(Number)
        return new Date(year, month, day).toISOString()
    }, [dayKey])

    const plannedOverdueParams = useMemo(
        () => ({
            status: 'planned',
            limit: isCalendar ? CALENDAR_LIMIT : limitPlannedOverdue,
            sortBy: 'plannedFor',
            sortOrder: 'desc',
            'filter[plannedFor][lt]': dayStartIso,
        }),
        [dayStartIso, limitPlannedOverdue, isCalendar],
    )
    const plannedComingParams = useMemo(
        () => ({
            status: 'planned',
            limit: isCalendar ? CALENDAR_LIMIT : limitPlannedComing,
            sortBy: 'plannedFor',
            sortOrder: 'asc',
            'filter[plannedFor][gte]': dayStartIso,
        }),
        [dayStartIso, limitPlannedComing, isCalendar],
    )
    const madeParams = useMemo(() => ({ limit: isCalendar ? CALENDAR_LIMIT : limitMade }), [limitMade, isCalendar])
    const collectionsOverdueParams = useMemo(
        () => ({
            status: 'planned',
            limit: isCalendar ? CALENDAR_LIMIT : limitCollectionsOverdue,
            sortBy: 'plannedFor',
            sortOrder: 'desc',
            'filter[plannedFor][lt]': dayStartIso,
        }),
        [dayStartIso, limitCollectionsOverdue, isCalendar],
    )
    const collectionsActiveParams = useMemo(
        () => ({
            status: 'planned',
            limit: isCalendar ? CALENDAR_LIMIT : limitCollectionsActive,
            sortBy: 'plannedFor',
            sortOrder: 'asc',
            'filter[plannedFor][gte]': dayStartIso,
        }),
        [dayStartIso, limitCollectionsActive, isCalendar],
    )
    const collectionsFinishedParams = useMemo(
        () => ({
            status: 'done',
            limit: isCalendar ? CALENDAR_LIMIT : limitCollectionsFinished,
            sortBy: 'completedAt',
            sortOrder: 'desc',
        }),
        [limitCollectionsFinished, isCalendar],
    )

    const {
        data: plannedOverdueData,
        isLoading: loadingPlannedOverdue,
        isFetching: fetchingPlannedOverdue,
    } = usePlannedCocktailsQuery(plannedOverdueParams, { enabled: isPlanned })
    const {
        data: plannedComingData,
        isLoading: loadingPlannedComing,
        isFetching: fetchingPlannedComing,
    } = usePlannedCocktailsQuery(plannedComingParams, { enabled: isPlanned })
    const {
        data: madeData,
        isLoading: loadingMade,
        isFetching: fetchingMade,
    } = useCocktailMadeLogsQuery(madeParams, { enabled: isMade })
    const {
        data: collectionsOverdueData,
        isLoading: loadingCollectionsOverdue,
        isFetching: fetchingCollectionsOverdue,
    } = usePlannedCollectionsQuery(collectionsOverdueParams, { enabled: isCollections })
    const {
        data: collectionsActiveData,
        isLoading: loadingCollectionsActive,
        isFetching: fetchingCollectionsActive,
    } = usePlannedCollectionsQuery(collectionsActiveParams, { enabled: isCollections })
    const {
        data: collectionsFinishedData,
        isLoading: loadingCollectionsFinished,
        isFetching: fetchingCollectionsFinished,
    } = usePlannedCollectionsQuery(collectionsFinishedParams, { enabled: isCollections })

    const { remove: deleteMadeLog } = useCocktailMadeLogMutations()

    const plannedOverdueItems = useMemo(() => plannedOverdueData?.items ?? [], [plannedOverdueData?.items])
    const plannedComingItems = useMemo(() => plannedComingData?.items ?? [], [plannedComingData?.items])
    const plannedItems = useMemo(() => [...plannedOverdueItems, ...plannedComingItems], [plannedOverdueItems, plannedComingItems])

    const madeLogs = useMemo(() => madeData?.items ?? [], [madeData?.items])

    const overdueCollections = useMemo(() => collectionsOverdueData?.items ?? [], [collectionsOverdueData?.items])
    const activeCollections = useMemo(() => collectionsActiveData?.items ?? [], [collectionsActiveData?.items])
    const finishedCollections = useMemo(() => collectionsFinishedData?.items ?? [], [collectionsFinishedData?.items])

    const plannedOverdueTotal = plannedOverdueData?.meta?.total ?? plannedOverdueItems.length
    const plannedComingTotal = plannedComingData?.meta?.total ?? plannedComingItems.length
    const plannedTotal = plannedOverdueTotal + plannedComingTotal

    const madeTotal = madeData?.meta?.total ?? madeLogs.length

    const collectionsOverdueTotal = collectionsOverdueData?.meta?.total ?? overdueCollections.length
    const collectionsActiveTotal = collectionsActiveData?.meta?.total ?? activeCollections.length
    const collectionsFinishedTotal = collectionsFinishedData?.meta?.total ?? finishedCollections.length
    const collectionsTabCount = collectionsOverdueTotal + collectionsActiveTotal

    const allIngredientIds = useMemo(() => {
        const ids = new Set<string>()
        for (const item of plannedItems) {
            for (const ingredient of item.cocktail?.ingredients ?? []) {
                ids.add(ingredient.ingredientId)
            }
        }
        return Array.from(ids)
    }, [plannedItems])

    const { getIngredientStatus } = useCocktailIngredientPantry(allIngredientIds)

    const reloadPlanned = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: queryKeys.plannedCocktails.all })
    }, [queryClient])
    const reloadMade = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: queryKeys.cocktailMadeLogs.all })
    }, [queryClient])
    const reloadCollections = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: queryKeys.plannedCollections.all })
    }, [queryClient])
    const reloadAll = useCallback(() => {
        void reloadPlanned()
        void reloadMade()
        void reloadCollections()
    }, [reloadPlanned, reloadMade, reloadCollections])

    const plannedOverdueGroups = useMemo(
        () => groupPlannedCocktailsByDay(plannedOverdueItems, 'desc'),
        [plannedOverdueItems],
    )
    const plannedComingGroups = useMemo(
        () => groupPlannedCocktailsByDay(plannedComingItems, 'asc'),
        [plannedComingItems],
    )

    const calendarPlanned = useMemo(() => {
        const map = new Map<string, typeof plannedOverdueItems[number]>()
        for (const item of [...plannedOverdueItems, ...plannedComingItems]) {
            const existing = map.get(item.id)
            if (!existing || (!existing.cocktail && item.cocktail)) map.set(item.id, item)
        }
        return Array.from(map.values())
    }, [plannedOverdueItems, plannedComingItems])

    const calendarCollections = useMemo(() => {
        const map = new Map<string, typeof overdueCollections[number]>()
        for (const item of [...overdueCollections, ...activeCollections, ...finishedCollections]) {
            if (!map.has(item.id)) map.set(item.id, item)
        }
        return Array.from(map.values())
    }, [overdueCollections, activeCollections, finishedCollections])

    const calendarMade = useMemo(() => madeLogs, [madeLogs])
    const sortedMade = useMemo(
        () => selectSortedMadeLogs(madeLogs),
        [madeLogs],
    )
    const sortedCollectionsOverdue = useMemo(
        () => selectSortedCollectionsByPlannedFor(overdueCollections, 'desc'),
        [overdueCollections],
    )
    const sortedCollectionsActive = useMemo(
        () => selectSortedCollectionsByPlannedFor(activeCollections, 'asc'),
        [activeCollections],
    )
    const sortedCollectionsFinished = useMemo(
        () => selectSortedFinishedCollections(finishedCollections),
        [finishedCollections],
    )

    const removeMadeLog = useCallback(
        async (id: string) => {
            try {
                await deleteMadeLog.mutateAsync(id)
                toast.success('Removed from history')
                void reloadMade()
            } catch {
                toast.error('Could not remove entry')
            }
        },
        [deleteMadeLog, reloadMade],
    )

    const heading =
        view === 'calendar'     ? 'Calendar'
        : view === 'planned'    ? 'All planned cocktails'
        : view === 'made'       ? 'All made cocktails'
        : 'All events'

    const subtitle =
        view === 'calendar'     ? 'Drag any cocktail or collection to reschedule it'
        : view === 'planned'    ? `${plannedTotal} planned cocktails`
        : view === 'made'       ? `${madeTotal} made logs`
        : collectionsTabCount === 0 ? 'Plan your first event' : `${collectionsTabCount} active events`

    const loading =
        view === 'calendar'     ? loadingPlannedOverdue || loadingPlannedComing || loadingMade || loadingCollectionsOverdue || loadingCollectionsActive
        : view === 'planned'    ? loadingPlannedOverdue || loadingPlannedComing
        : view === 'made'       ? loadingMade
        : loadingCollectionsOverdue || loadingCollectionsActive || loadingCollectionsFinished

    return (
        <>
            <PlannerFullView
                view={view}
                now={now}
                heading={heading}
                subtitle={subtitle}
                loading={loading}
                plannedOverdueGroups={plannedOverdueGroups}
                plannedComingGroups={plannedComingGroups}
                sortedMade={sortedMade}
                sortedCollectionsOverdue={sortedCollectionsOverdue}
                sortedCollectionsActive={sortedCollectionsActive}
                sortedCollectionsFinished={sortedCollectionsFinished}
                calendarPlanned={calendarPlanned}
                calendarCollections={calendarCollections}
                calendarMade={calendarMade}
                plannedTotal={plannedTotal}
                plannedOverdueTotal={plannedOverdueTotal}
                plannedOverdueCount={plannedOverdueItems.length}
                plannedComingTotal={plannedComingTotal}
                plannedComingCount={plannedComingItems.length}
                madeTotal={madeTotal}
                madeCount={madeLogs.length}
                collectionsOverdueTotal={collectionsOverdueTotal}
                collectionsOverdueCount={overdueCollections.length}
                collectionsActiveTotal={collectionsActiveTotal}
                collectionsActiveCount={activeCollections.length}
                collectionsFinishedTotal={collectionsFinishedTotal}
                collectionsFinishedCount={finishedCollections.length}
                collectionsTabCount={collectionsTabCount}
                getIngredientStatus={getIngredientStatus}
                onUpdate={reloadAll}
                onRemoveMadeLog={removeMadeLog}
                onOpenCreateCollection={() => { setQuickCreateDate(undefined); setShowCreateCollection(true) }}
                onOpenCreateCollectionWithDate={(dateStr) => { setQuickCreateDate(dateStr); setShowCreateCollection(true) }}
                onLoadMorePlannedOverdue={() => setLimitPlannedOverdue((prev) => prev + PAGE_SIZE_PLANNED_OVERDUE)}
                onLoadMorePlannedComing={() => setLimitPlannedComing((prev) => prev + PAGE_SIZE_PLANNED_COMING)}
                onLoadMoreMade={() => setLimitMade((prev) => prev + PAGE_SIZE_MADE)}
                onLoadMoreCollectionsOverdue={() => setLimitCollectionsOverdue((prev) => prev + PAGE_SIZE_COLLECTIONS_OVERDUE)}
                onLoadMoreCollectionsActive={() => setLimitCollectionsActive((prev) => prev + PAGE_SIZE_COLLECTIONS_ACTIVE)}
                onLoadMoreCollectionsFinished={() => setLimitCollectionsFinished((prev) => prev + PAGE_SIZE_COLLECTIONS_FINISHED)}
                isFetchingMade={fetchingMade}
                isFetchingPlannedOverdue={fetchingPlannedOverdue}
                isFetchingPlannedComing={fetchingPlannedComing}
                isFetchingCollectionsOverdue={fetchingCollectionsOverdue}
                isFetchingCollectionsActive={fetchingCollectionsActive}
                isFetchingCollectionsFinished={fetchingCollectionsFinished}
            />

            {showCreateCollection && (
                <CreatePlannedCollectionDialog
                    initialDate={quickCreateDate}
                    onClose={() => { setShowCreateCollection(false); setQuickCreateDate(undefined) }}
                    onCreated={() => {
                        setShowCreateCollection(false)
                        setQuickCreateDate(undefined)
                        reloadAll()
                    }}
                />
            )}
        </>
    )
}
