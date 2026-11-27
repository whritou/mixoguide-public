'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { MessageSquarePlus, PackageOpen, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterBanner } from '@/components/home/ingredients/FilterBanner'
import type { FilterKey } from '@/components/home/ingredients/FilterConstants'
import IngredientCard from '@/components/home/ingredients/IngredientCard'
import SuggestionDialog from '@/components/home/suggestions/SuggestionDialog'
import Loader from '@/components/ui/Loader'
import { useIngredientsQuery } from '@/hooks/queries/use-ingredients'
import { useIngredientSubTypesQuery } from '@/hooks/queries/use-ingredient-subtypes'
import { useIngredientTypesQuery } from '@/hooks/queries/use-ingredient-types'
import { useAutoLoadMore } from '@/hooks/use-auto-load-more'
import { useOffsetAccumulator } from '@/hooks/use-offset-accumulator'
import { useFilters } from '@/hooks/useFilters'
import type { Ingredient } from '@/types/models/ingredient'
import { hasIngredientFilters } from '@/utils/filters'

const PAGE_SIZE = 20

export default function IngredientPage() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <IngredientPageContent />
        </Suspense>
    )
}

function PageSkeleton() {
    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center">
            <Loader />
        </div>
    )
}

function IngredientPageContent() {
    const [open, setOpen] = useState<FilterKey | null>(null)
    const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false)
    const [offset, setOffset] = useState(0)

    const { data: session } = useSession()
    const filters = useFilters()

    const filterParams = useMemo(() => {
        const { limit: _limit, ...rest } = Object.fromEntries(filters.params.entries())
        return rest
    }, [filters.params])
    const filterKey = JSON.stringify(filterParams)

    useEffect(() => {
        setOffset(0)
    }, [filterKey])

    const requestParams = useMemo(
        () => ({ ...filterParams, limit: PAGE_SIZE, offset }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filterKey, offset],
    )

    const {
        data,
        isLoading,
        isFetched,
        isFetching,
    } = useIngredientsQuery(requestParams)
    const { data: ingredientTypesData } = useIngredientTypesQuery({ limit: 200 })
    const { data: ingredientSubTypesData } = useIngredientSubTypesQuery({ limit: 200 })

    const ingredientTypes = ingredientTypesData?.items ?? []
    const ingredientSubTypes = ingredientSubTypesData?.items ?? []

    const allIngredientsAccumulator = useOffsetAccumulator<Ingredient>({
        filterKey,
        offset,
        pageItems: data?.items ?? [],
        isLoading,
        isFetched,
        isFetching,
    })
    const allIngredients = allIngredientsAccumulator.items

    const loadMore = useCallback(() => {
        if (isLoading) return
        setOffset((current) => current + PAGE_SIZE)
    }, [isLoading])

    const handleReset = () => {
        setOffset(0)
        allIngredientsAccumulator.reset()
        filters.resetAll()
    }

    const hasActiveFilters = hasIngredientFilters(filters.params)
    const search = filters.params.get('search') ?? ''

    const total = data?.meta?.total ?? 0
    const hasMore = !isLoading && total > allIngredients.length
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
                                onClick={handleReset}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8 mx-auto">
                    {isLoading && allIngredients.length === 0 ? (
                        <Loader />
                    ) : allIngredients.length === 0 ? (
                        <IngredientsEmptyState
                            hasActiveFilters={hasActiveFilters}
                            search={search}
                        />
                    ) : (
                        allIngredients.map((ingredient) => (
                            <IngredientCard
                                key={ingredient.id}
                                ingredient={ingredient}
                                types={ingredientTypes}
                                subTypes={ingredientSubTypes}
                            />
                        ))
                    )}
                </div>

                {hasMore ? (
                    <div ref={loadMoreRef} className="mt-10 flex min-h-10 justify-center" aria-live="polite">
                        {isFetching && offset > 0 && <Loader variant="spinner" />}
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
