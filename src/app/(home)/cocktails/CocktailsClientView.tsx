'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MessageSquarePlus, PackageOpen, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { CocktailCard } from '@/components/home/cocktails/CocktailCard'
import { CocktailFilterBar } from '@/components/home/cocktails/CocktailFilterBar'
import AddPantryItemDialog from '@/components/home/pantry/dialog/AddPantryItemDialog'
import SuggestionDialog from '@/components/home/suggestions/SuggestionDialog'
import Loader from '@/components/ui/Loader'
import { useInfiniteCocktailsQuery } from '@/hooks/queries/use-cocktails'
import { useIngredientOptionsQuery, type IngredientOption } from '@/hooks/queries/use-ingredients'
import { useMakeableCocktailsQuery } from '@/hooks/queries/use-makeable'
import { useRecommendationsQuery } from '@/hooks/queries/use-recommendations'
import { useAutoLoadMore } from '@/hooks/use-auto-load-more'
import { useIdle } from '@/hooks/use-idle'
import { useFavorites } from '@/hooks/useFavorite'
import { useFilters } from '@/hooks/useFilters'
import { flattenUnique } from '@/lib/api/pagination'
import type { Cocktail, MakeableCocktail } from '@/types/models/cocktail'
import { hasCocktailFilters } from '@/utils/filters'

const PAGE_SIZE = 20
const EMPTY_OPTIONS: IngredientOption[] = []

/**
 * Grid items skip rendering work while off-screen (PERF-010). The padding /
 * negative margin pair keeps card shadows and focus rings inside the item's
 * paint-containment box so they are not clipped.
 */
const GRID_ITEM_CLASS = '[content-visibility:auto] [contain-intrinsic-size:auto_380px] p-2 -m-2'

function matchesAvailability(cocktail: MakeableCocktail, availability: string): boolean {
    switch (availability) {
        case 'full':
            return cocktail.makeableStatus === 'full'
        case 'withSubstitutes':
            return cocktail.makeableStatus === 'withSubstitutes' || cocktail.makeableStatus === 'withDerivates'
        case 'missing1':
            return cocktail.makeableStatus === 'missing' && cocktail.missingCount === 1
        case 'missing2':
            return cocktail.makeableStatus === 'missing' && cocktail.missingCount === 2
        case 'missing3plus':
            return cocktail.makeableStatus === 'missing' && cocktail.missingCount >= 3
        default:
            return true
    }
}

/**
 * Client island for /cocktails. Filters live in the URL; the server list is a
 * `useInfiniteQuery` keyed by the committed URL filters, so a filter change
 * starts a new list in the same render (no offset-reset effects).
 */
export default function CocktailsClientView() {
    const { data: session, status: authStatus } = useSession()
    const isAuthenticated = authStatus === 'authenticated'

    const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false)
    const [openAdd, setOpenAdd] = useState(false)

    const filters = useFilters()
    const searchParams = useSearchParams()
    const urlKey = searchParams.toString()
    const rawParams = useMemo(
        () => Object.fromEntries(new URLSearchParams(urlKey).entries()),
        [urlKey],
    )

    const onlyMakeable = rawParams.onlyMakeable === 'true'
    const filteringByFavs = rawParams.onlyFavorites === 'true'
    const hasExplicitSort = Boolean(rawParams.sortBy)

    const { cocktails: makeableList, loading: makeableLoading, reload: reloadMakeable } = useMakeableCocktailsQuery(10)
    const makeableMap = useMemo(() => new Map(makeableList.map((cocktail) => [cocktail.id, cocktail])), [makeableList])

    const { data: recommendations } = useRecommendationsQuery()
    const neverTriedIds = useMemo(
        () => new Set(recommendations?.neverTried.map((cocktail) => cocktail.id) ?? []),
        [recommendations],
    )

    const { ids: favoriteIds, loading: favoriteLoading } = useFavorites()
    const favoriteKey = favoriteIds.join(',')

    // The 300-ingredient option list only feeds the filter pickers: fetch it once
    // the page is idle (or immediately if an ingredient filter is already active),
    // and keep it cached for an hour.
    const idle = useIdle()
    const { data: ingredientOpts = EMPTY_OPTIONS } = useIngredientOptionsQuery({
        enabled: idle || Boolean(rawParams.ingredients),
    })

    // ── "Ready to mix" (client-side over the makeable list) ──────────────────
    const clientFilterKey = filters.params.toString()
    const clientFiltered = useMemo(() => {
        if (!onlyMakeable) return []
        const params = new URLSearchParams(clientFilterKey)
        const search = params.get('search')?.toLowerCase() ?? ''
        const availability = params.get('availability') ?? 'all'
        const difficulties = (params.get('difficulty') ?? '').split(',').filter(Boolean)
        const flavors = (params.get('flavors') ?? '').split(',').filter(Boolean)

        return makeableList.filter((cocktail) => {
            if (search && !cocktail.name.toLowerCase().includes(search)) return false
            if (!matchesAvailability(cocktail, availability)) return false
            if (difficulties.length > 0 && !difficulties.includes(cocktail.difficulty)) return false
            if (flavors.length > 0 && !flavors.some((flavor) => cocktail.flavors?.includes(flavor as never))) return false
            return true
        })
    }, [clientFilterKey, makeableList, onlyMakeable])

    // Visible slice of the client list; resets whenever the filters change
    // because the count is stored together with the filter key it belongs to.
    const [displayed, setDisplayed] = useState({ key: clientFilterKey, count: PAGE_SIZE })
    const displayedCount = displayed.key === clientFilterKey ? displayed.count : PAGE_SIZE

    // ── Server list ──────────────────────────────────────────────────────────
    const serverParams = useMemo(() => {
        const {
            limit: _limit,
            offset: _offset,
            onlyMakeable: _onlyMakeable,
            onlyFavorites: _onlyFavorites,
            ...rest
        } = rawParams
        // Favorites filter is still a client-computed id allow-list (the API has no
        // server-side "only my favorites" flag yet), so only this mode waits for
        // the favorites query. All other modes fetch in parallel with it.
        if (filteringByFavs) return { ...rest, favoriteIds: favoriteKey || '__none__' }
        return rest
    }, [rawParams, filteringByFavs, favoriteKey])

    const waitingForFavorites = filteringByFavs && favoriteLoading
    const list = useInfiniteCocktailsQuery(serverParams, {
        pageSize: PAGE_SIZE,
        enabled: !onlyMakeable && !waitingForFavorites,
    })
    const allCocktails = useMemo(() => flattenUnique<Cocktail>(list.data?.pages), [list.data])

    const serverCocktails = useMemo(() => {
        if (!session || hasExplicitSort || filteringByFavs || favoriteIds.length === 0) return allCocktails
        const favoriteSet = new Set(favoriteIds)
        return [
            ...allCocktails.filter((cocktail) => favoriteSet.has(cocktail.id)),
            ...allCocktails.filter((cocktail) => !favoriteSet.has(cocktail.id)),
        ]
    }, [allCocktails, favoriteIds, filteringByFavs, hasExplicitSort, session])

    const isLoading = onlyMakeable
        ? isAuthenticated && makeableLoading
        : list.isLoading || waitingForFavorites

    const displayList: Array<{ cocktail: Cocktail; makeable?: MakeableCocktail }> = onlyMakeable
        ? clientFiltered.slice(0, displayedCount).map((cocktail) => ({ cocktail, makeable: cocktail }))
        : serverCocktails.map((cocktail) => ({
            cocktail,
            makeable: isAuthenticated ? makeableMap.get(cocktail.id) : undefined,
        }))

    const hasMoreServer = !onlyMakeable && Boolean(list.hasNextPage)
    const hasMoreClient = onlyMakeable && displayedCount < clientFiltered.length

    const hasActiveFilters = hasCocktailFilters(filters.params)

    const { fetchNextPage, isFetchingNextPage } = list
    const loadMore = useCallback(() => {
        if (onlyMakeable) {
            setDisplayed({ key: clientFilterKey, count: displayedCount + PAGE_SIZE })
            return
        }
        if (!isFetchingNextPage) void fetchNextPage()
    }, [onlyMakeable, clientFilterKey, displayedCount, isFetchingNextPage, fetchNextPage])

    const loadMoreRef = useAutoLoadMore({
        enabled: hasMoreServer || hasMoreClient,
        isLoading: !onlyMakeable && list.isFetching,
        onLoadMore: loadMore,
    })

    return (
        <div className="min-h-screen bg-canvas">
            <CocktailFilterBar filters={filters} isAuthenticated={isAuthenticated} ingredientOpts={ingredientOpts} />

            <div className="max-w-screen-2xl mx-auto px-4 md:px-12 pt-8 pb-20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-headline text-3xl text-fg">
                            {onlyMakeable ? 'Ready to mix' : 'Cocktails'}
                        </h1>
                        <p className="text-sm text-fg-muted mt-0.5">
                            {onlyMakeable
                                ? `${clientFiltered.length} cocktail${clientFiltered.length !== 1 ? 's' : ''} makeable with your pantry`
                                : 'Browse our full collection'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {hasActiveFilters && (
                            <button
                                onClick={filters.resetAll}
                                className="text-xs text-fg-muted hover:text-fg underline underline-offset-2 transition-colors"
                            >
                                Clear filters
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (!session?.user) {
                                    window.location.href = `/signin?callbackUrl=${encodeURIComponent('/cocktails')}`
                                    return
                                }
                                setSuggestionDialogOpen(true)
                            }}
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-soft/40 text-brand text-sm hover:bg-surface-muted transition-colors"
                        >
                            <MessageSquarePlus size={14} />
                            Suggest
                        </button>
                    </div>
                </div>

                {isLoading && displayList.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <Loader />
                    </div>
                ) : displayList.length === 0 ? (
                    <CocktailsEmptyState
                        onlyMakeable={onlyMakeable}
                        hasSearch={Boolean(filters.params.get('search'))}
                        hasActiveFilters={hasActiveFilters}
                        search={filters.params.get('search') ?? ''}
                        onAddIngredients={() => setOpenAdd(true)}
                    />
                ) : (
                    <ul role="list" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                        {displayList.map(({ cocktail, makeable }) => (
                            <li key={cocktail.id} className={GRID_ITEM_CLASS}>
                                <CocktailCard
                                    cocktail={cocktail}
                                    makeable={makeable}
                                    isNeverTried={isAuthenticated ? neverTriedIds.has(cocktail.id) : false}
                                />
                            </li>
                        ))}
                    </ul>
                )}

                {(hasMoreServer || hasMoreClient) && (
                    <div ref={loadMoreRef} className="mt-10 flex min-h-10 justify-center" aria-live="polite">
                        {isFetchingNextPage && !onlyMakeable && <Loader variant="spinner" />}
                    </div>
                )}
            </div>

            <SuggestionDialog
                open={suggestionDialogOpen}
                onOpenChange={setSuggestionDialogOpen}
                defaultType="NEW_COCKTAIL"
            />

            <AddPantryItemDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={reloadMakeable} />
        </div>
    )
}

function CocktailsEmptyState({
    onlyMakeable,
    hasSearch,
    hasActiveFilters,
    search,
    onAddIngredients,
}: {
    onlyMakeable: boolean
    hasSearch: boolean
    hasActiveFilters: boolean
    search: string
    onAddIngredients: () => void
}) {
    const Icon = hasSearch || hasActiveFilters ? SearchX : PackageOpen
    const title = hasSearch || hasActiveFilters
        ? 'No matching cocktails'
        : onlyMakeable
            ? 'No makeable cocktails yet'
            : 'No cocktails yet'

    const body = hasSearch
        ? <>No cocktails match <span className="font-medium text-fg-secondary">{search.trim()}</span>.</>
        : hasActiveFilters
            ? 'Try changing or clearing the current filters.'
            : onlyMakeable
                ? 'Add ingredients to your pantry and ready-to-mix drinks will appear here.'
                : 'Cocktails will appear here once they are available.'

    return (
        <EmptyState
            icon={Icon}
            heading={title}
            body={body}
            bordered
            action={onlyMakeable && !hasSearch && !hasActiveFilters ? (
                <button
                    onClick={onAddIngredients}
                    className="mt-2 px-8 py-3 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand rounded-full font-label text-xs uppercase tracking-widest hover:scale-[0.98] transition-transform duration-200"
                >
                    Add ingredients to pantry
                </button>
            ) : undefined}
        />
    )
}
