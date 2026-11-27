'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MessageSquarePlus, PackageOpen, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterBanner } from '@/components/home/ingredients/FilterBanner'
import type { FilterKey } from '@/components/home/ingredients/FilterConstants'
import IngredientCard from '@/components/home/ingredients/IngredientCard'
import SuggestionDialog from '@/components/home/suggestions/SuggestionDialog'
import Loader from '@/components/ui/Loader'
import { useInfiniteIngredientsQuery } from '@/hooks/queries/use-ingredients'
import { useIngredientSubTypesQuery } from '@/hooks/queries/use-ingredient-subtypes'
import { useIngredientTypesQuery } from '@/hooks/queries/use-ingredient-types'
import { useAutoLoadMore } from '@/hooks/use-auto-load-more'
import { useFilters } from '@/hooks/useFilters'
import { flattenUnique } from '@/lib/api/pagination'
import type { Ingredient } from '@/types/models/ingredient'
import { hasIngredientFilters } from '@/utils/filters'

const PAGE_SIZE = 20

/** See GRID_ITEM_CLASS in CocktailsClientView (PERF-010). */
const GRID_ITEM_CLASS = '[content-visibility:auto] [contain-intrinsic-size:auto_420px] p-2 -m-2'

/**
 * Client island for /ingredients: URL-driven filters + `useInfiniteQuery`
 * keyed by the committed URL filters (no offset state or reset effects).
 */
export default function IngredientsClientView() {
    return <IngredientPageContent />
}

function IngredientPageContent() {
    const [open, setOpen] = useState<FilterKey | null>(null)
    const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false)

    const { data: session } = useSession()
    const filters = useFilters()

    // Fetch by the committed URL (not the optimistic overlay), so debounced
    // search keystrokes do not each trigger a request.
    const searchParams = useSearchParams()
    const urlKey = searchParams.toString()
    const filterParams = useMemo(() => {
        const { limit: _limit, offset: _offset, ...rest } = Object.fromEntries(new URLSearchParams(urlKey).entries())
        return rest
    }, [urlKey])

    const list = useInfiniteIngredientsQuery(filterParams, { pageSize: PAGE_SIZE })
    const { isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = list
    const { data: ingredientTypesData } = useIngredientTypesQuery({ limit: 200 })
    const { data: ingredientSubTypesData } = useIngredientSubTypesQuery({ limit: 200 })

    const ingredientTypes = ingredientTypesData?.items ?? []
    const ingredientSubTypes = ingredientSubTypesData?.items ?? []

    const allIngredients = useMemo(() => flattenUnique<Ingredient>(list.data?.pages), [list.data])

    const loadMore = useCallback(() => {
        if (!isFetchingNextPage) void fetchNextPage()
    }, [isFetchingNextPage, fetchNextPage])

    const hasActiveFilters = hasIngredientFilters(filters.params)
    const search = filters.params.get('search') ?? ''

    const hasMore = !isLoading && Boolean(hasNextPage)
    const loadMoreRef = useAutoLoadMore({
        enabled: hasMore,
        isLoading: isFetching,
        onLoadMore: loadMore,
    })

    return (
        <div className="min-h-screen bg-canvas pb-16">
            <SuggestionDialog
                open={suggestionDialogOpen}
                onOpenChange={setSuggestionDialogOpen}
                defaultType="NEW_INGREDIENT"
            />

            <FilterBanner
                openKey={open}
                setOpenKey={setOpen}
                filters={filters}
                typeOpts={ingredientTypes}
                subTypeOpts={ingredientSubTypes}
            />

            <div className="max-w-screen-2xl mx-auto px-4 md:px-12 pt-8 pb-20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-headline text-3xl text-fg">Ingredients</h1>
                        <p className="text-sm text-fg-muted mt-0.5">
                            Explore all the ingredients in our library.
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
                                    window.location.href = `/signin?callbackUrl=${encodeURIComponent('/ingredients')}`
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

                {isLoading && allIngredients.length === 0 ? (
                    <div className="flex justify-center py-20 mt-8">
                        <Loader />
                    </div>
                ) : allIngredients.length === 0 ? (
                    <div className="grid grid-cols-1 gap-6 mt-8">
                        <IngredientsEmptyState
                            hasActiveFilters={hasActiveFilters}
                            search={search}
                        />
                    </div>
                ) : (
                    <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8 mx-auto">
                        {allIngredients.map((ingredient) => (
                            <li key={ingredient.id} className={GRID_ITEM_CLASS}>
                                <IngredientCard
                                    ingredient={ingredient}
                                    types={ingredientTypes}
                                    subTypes={ingredientSubTypes}
                                />
                            </li>
                        ))}
                    </ul>
                )}

                {hasMore ? (
                    <div ref={loadMoreRef} className="mt-10 flex min-h-10 justify-center" aria-live="polite">
                        {isFetchingNextPage && <Loader variant="spinner" />}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

function IngredientsEmptyState({
    hasActiveFilters,
    search,
}: {
    hasActiveFilters: boolean
    search: string
}) {
    const hasSearch = search.trim().length > 0
    const Icon = hasActiveFilters ? SearchX : PackageOpen

    const title = hasActiveFilters
        ? 'No matching ingredients'
        : 'No ingredients yet'

    const body = hasSearch
        ? <>No ingredients match <span className="font-medium text-fg-secondary">{search.trim()}</span>.</>
        : hasActiveFilters
            ? 'Try changing or clearing the current filters.'
            : 'Ingredients will appear here once they are available.'

    return <EmptyState icon={Icon} heading={title} body={body} bordered className="col-span-full" />
}
