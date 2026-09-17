'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MessageSquarePlus, PackageOpen, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { CocktailCard } from '@/components/home/cocktails/CocktailCard'
import { CocktailFilterBar } from '@/components/home/cocktails/CocktailFilterBar'
import AddPantryItemDialog from '@/components/home/pantry/dialog/AddPantryItemDialog'
import SuggestionDialog from '@/components/home/suggestions/SuggestionDialog'
import Loader from '@/components/ui/Loader'
import { useCocktailsQuery } from '@/hooks/queries/use-cocktails'
import { useIngredientsQuery } from '@/hooks/queries/use-ingredients'
import { useMakeableCocktailsQuery } from '@/hooks/queries/use-makeable'
import { useRecommendationsQuery } from '@/hooks/queries/use-recommendations'
import { useAutoLoadMore } from '@/hooks/use-auto-load-more'
import { useOffsetAccumulator } from '@/hooks/use-offset-accumulator'
import { useFavorites } from '@/hooks/useFavorite'
import { useFilters } from '@/hooks/useFilters'
import type { Cocktail, MakeableCocktail } from '@/types/models/cocktail'
import { hasCocktailFilters } from '@/utils/filters'

const PAGE_SIZE = 20

export default function CocktailsClientView() {
    return <CocktailPageContent />
}

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

function CocktailPageContent() {
    const { data: session, status: authStatus } = useSession()
    const isAuthenticated = authStatus === 'authenticated'

    const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false)
    const [openAdd, setOpenAdd] = useState(false)
    const [displayed, setDisplayed] = useState(PAGE_SIZE)
    const [offset, setOffset] = useState(0)

    const filters = useFilters()
    const searchParams = useSearchParams()
    const rawParams = Object.fromEntries(searchParams.entries())

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

    const { data: ingredientsData } = useIngredientsQuery({ limit: 300 })
    const ingredientOpts = ingredientsData?.items?.map((ingredient) => ({ id: ingredient.id, name: ingredient.name })) ?? []

    const clientFiltered = useMemo(() => {
        if (!onlyMakeable) return []
        const search = filters.params.get('search')?.toLowerCase() ?? ''
        const availability = filters.params.get('availability') ?? 'all'
        const difficulties = (filters.params.get('difficulty') ?? '').split(',').filter(Boolean)
        const flavors = (filters.params.get('flavors') ?? '').split(',').filter(Boolean)

        return makeableList.filter((cocktail) => {
            if (search && !cocktail.name.toLowerCase().includes(search)) return false
            if (!matchesAvailability(cocktail, availability)) return false
            if (difficulties.length > 0 && !difficulties.includes(cocktail.difficulty)) return false
            if (flavors.length > 0 && !flavors.some((flavor) => cocktail.flavors?.includes(flavor as never))) return false
            return true
        })
    }, [filters.params, makeableList, onlyMakeable])

    useEffect(() => {
        setDisplayed(PAGE_SIZE)
    }, [filters.params])

    const effectiveParams = useMemo(() => {
        if (filteringByFavs) {
            const { onlyFavorites: _onlyFavorites, limit: _limit, onlyMakeable: _onlyMakeable, ...rest } = rawParams
            return favoriteIds.length > 0
                ? { ...rest, favoriteIds: favoriteIds.join(',') }
                : { ...rest, favoriteIds: '__none__' }
        }

        const { limit: _limit, onlyMakeable: _onlyMakeable, ...rest } = rawParams
        return rest
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(rawParams), favoriteIds.join(',')])

    const filterKey = JSON.stringify(effectiveParams)

    useEffect(() => {
        setOffset(0)
    }, [filterKey])

    const requestParams = useMemo(
        () => ({ ...effectiveParams, limit: PAGE_SIZE, offset }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filterKey, offset],
    )

    const {
        data,
        isLoading: serverLoading,
        isFetching: serverFetching,
        isFetched: serverFetched,
    } = useCocktailsQuery(onlyMakeable ? { limit: 0 } : requestParams)

    const allCocktailsAccumulator = useOffsetAccumulator<Cocktail>({
        filterKey,
        offset,
        pageItems: data?.items ?? [],
        isLoading: serverLoading || (filteringByFavs && favoriteLoading),
        isFetched: serverFetched,
        isFetching: serverFetching,
        enabled: !onlyMakeable,
        waitForFetchWhenEmpty: true,
    })
    const allCocktails = allCocktailsAccumulator.items

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
        : serverLoading || (filteringByFavs && favoriteLoading)

    const displayList: Array<{ cocktail: Cocktail; makeable?: MakeableCocktail }> = onlyMakeable
        ? clientFiltered.slice(0, displayed).map((cocktail) => ({ cocktail, makeable: cocktail }))
        : serverCocktails.map((cocktail) => ({
            cocktail,
            makeable: isAuthenticated ? makeableMap.get(cocktail.id) : undefined,
        }))

    const serverTotal = data?.meta?.total ?? 0
    const hasMoreServer = !onlyMakeable && !serverLoading && serverTotal > allCocktails.length
    const hasMoreClient = onlyMakeable && displayed < clientFiltered.length

    const hasActiveFilters = hasCocktailFilters(filters.params)

    const handleReset = () => {
        setOffset(0)
        allCocktailsAccumulator.reset()
        filters.resetAll()
    }

    const loadMore = useCallback(() => {
        if (onlyMakeable) {
            setDisplayed((current) => current + PAGE_SIZE)
            return
        }
        setOffset((current) => current + PAGE_SIZE)
    }, [onlyMakeable])

    const loadMoreRef = useAutoLoadMore({
        enabled: hasMoreServer || hasMoreClient,
        isLoading: !onlyMakeable && serverFetching,
        onLoadMore: loadMore,
    })

    return (
        <div className="min-h-screen bg-mg-cream">
            <CocktailFilterBar filters={filters} isAuthenticated={isAuthenticated} ingredientOpts={ingredientOpts} />

            <div className="max-w-screen-2xl mx-auto px-4 md:px-12 pt-8 pb-20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-headline text-3xl text-mg-ink">
                            {onlyMakeable ? 'Ready to mix' : 'Cocktails'}
                        </h1>
                        <p className="text-sm text-mg-muted mt-0.5">
                            {onlyMakeable
                                ? `${clientFiltered.length} cocktail${clientFiltered.length !== 1 ? 's' : ''} makeable with your pantry`
                                : 'Browse our full collection'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {hasActiveFilters && (
                            <button
                                onClick={handleReset}
                                className="text-xs text-mg-muted hover:text-mg-ink underline underline-offset-2 transition-colors"
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
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-mg-caramel/40 text-mg-brown text-sm hover:bg-[#f5ece0] transition-colors"
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                        {displayList.map(({ cocktail, makeable }) => (
                            <CocktailCard
                                key={cocktail.id}
                                cocktail={cocktail}
                                makeable={makeable}
                                isNeverTried={isAuthenticated ? neverTriedIds.has(cocktail.id) : false}
                            />
                        ))}
                    </div>
                )}

                {(hasMoreServer || hasMoreClient) && (
                    <div ref={loadMoreRef} className="mt-10 flex min-h-10 justify-center" aria-live="polite">
                        {serverFetching && !onlyMakeable && <Loader variant="spinner" />}
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
        ? <>No cocktails match <span className="font-medium text-mg-charcoal">{search.trim()}</span>.</>
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
                    className="mt-2 px-8 py-3 bg-gradient-to-br from-mg-brown to-mg-caramel text-white rounded-full font-label text-xs uppercase tracking-widest hover:scale-[0.98] transition-transform duration-200"
                >
                    Add ingredients to pantry
                </button>
            ) : undefined}
        />
    )
}
