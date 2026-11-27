'use client'

import { Suspense, useCallback, useMemo, useState } from 'react'
import { Menu } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { PantryFilterBar } from '@/components/home/pantry/PantryFilterBar'
import { PantrySidebar } from '@/components/home/pantry/PantrySidebar'
import { PantryTable } from '@/components/home/pantry/PantryTable'
import AddPantryItemDialog from '@/components/home/pantry/dialog/AddPantryItemDialog'
import RestockPantryDialog from '@/components/home/pantry/dialog/RestockPantryDialog'
import {
    deriveSortOption,
    type SortOption,
    type ScopeFilter,
    type StockStatusFilter,
} from '@/components/home/pantry/pantry.constants'
import Loader from '@/components/ui/Loader'
import { usePantryQuery } from '@/hooks/queries/use-pantry'
import { usePantryStatsQuery } from '@/hooks/queries/use-pantry-stats'
import { useFilters } from '@/hooks/useFilters'
import { queryKeys } from '@/lib/query-keys'
import { isRestockCandidate } from '@/utils/pantryRestock'

const PAGE_SIZE = 10

export default function PantryPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-canvas flex items-center justify-center"><Loader /></div>}>
            <PantryPageContent />
        </Suspense>
    )
}

function PantryPageContent() {
    const queryClient = useQueryClient()
    const filters = useFilters(PAGE_SIZE)

    const [openAdd, setOpenAdd] = useState(false)
    const [openRestock, setOpenRestock] = useState(false)
    const [mobileSidebar, setMobileSidebar] = useState(false)

    const rawParams = useMemo(
        () => Object.fromEntries(filters.params.entries()) as Record<string, string>,
        [filters.params],
    )

    const scopeFilter: ScopeFilter = useMemo(() => {
        const value = rawParams.status
        return value === 'in-pantry' || value === 'shopping' ? value : 'all'
    }, [rawParams.status])

    const stockStatusFilter: StockStatusFilter = useMemo(() => {
        const fromLegacyStatus = rawParams.status === 'low-stock' || rawParams.status === 'out-of-stock' || rawParams.status === 'expiring'
            ? rawParams.status
            : null
        const value = rawParams.stockStatus ?? fromLegacyStatus
        return value === 'low-stock' || value === 'out-of-stock' || value === 'expiring' ? value : 'all'
    }, [rawParams.status, rawParams.stockStatus])

    const favoritesOnly = rawParams.favorite === 'true'
    const search = rawParams.search ?? ''
    const selectedCategory = rawParams.category ?? null
    const hasActiveFilter = Boolean(
        search.trim() ||
        favoritesOnly ||
        scopeFilter !== 'all' ||
        stockStatusFilter !== 'all' ||
        selectedCategory,
    )
    const sortOption: SortOption = useMemo(
        () => deriveSortOption(rawParams.sortBy, rawParams.sortOrder),
        [rawParams.sortBy, rawParams.sortOrder],
    )

    const requestFilterParams = useMemo(() => {
        const { limit: _limit, offset: _offset, status: _status, stockStatus: _stockStatus, ...rest } = rawParams
        const normalized: Record<string, string> = {
            ...rest,
            sortBy: rest.sortBy ?? 'ingredient.name',
            sortOrder: rest.sortOrder ?? 'asc',
        }
        if (scopeFilter !== 'all') normalized.status = scopeFilter
        if (stockStatusFilter !== 'all') normalized.stockStatus = stockStatusFilter
        return {
            ...normalized,
        }
    }, [rawParams, scopeFilter, stockStatusFilter])

    const filterKey = JSON.stringify(requestFilterParams)
    const [pagination, setPagination] = useState(() => ({ filterKey, offset: 0 }))
    const effectiveOffset = pagination.filterKey === filterKey ? pagination.offset : 0

    const requestParams = useMemo(
        () => ({ ...requestFilterParams, limit: PAGE_SIZE, offset: effectiveOffset }),
        [requestFilterParams, effectiveOffset],
    )

    const { data, isLoading: loading, isFetched, isFetching } = usePantryQuery(requestParams)
    const { data: restockData } = usePantryQuery({
        limit: 500,
        status: 'in-pantry',
        sortBy: 'ingredient.name',
        sortOrder: 'asc',
    })
    const { data: pantryStats, isLoading: pantryStatsLoading } = usePantryStatsQuery()

    const pageItems = data?.items ?? []
    const restockItems = useMemo(
        () => (restockData?.items ?? []).filter(isRestockCandidate),
        [restockData?.items],
    )
    const meta = data?.meta

    const handleReload = useCallback(() => {
        setPagination({ filterKey, offset: 0 })
        void queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.pantryStats.all })
    }, [filterKey, queryClient])

    const handleDeleted = useCallback((_id: string) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.pantryStats.all })
    }, [queryClient])

    const handleItemUpdated = useCallback((_id: string, _updates: object) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.pantryStats.all })
    }, [queryClient])

    const stats = pantryStats ?? { total: 0, low: 0, out: 0, toBuy: 0 }
    const categories = (pantryStats?.categories ?? []).map((category) => [category.name, category.count] as [string, number])

    const totalItems = meta?.total ?? 0
    const pageSize = meta?.limit ?? PAGE_SIZE
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const currentPage = Math.max(1, Math.min(totalPages, meta?.page ?? Math.floor(effectiveOffset / pageSize) + 1))
    const canPrev = currentPage > 1
    const canNext = currentPage < totalPages

    const isInitialLoad = (loading && !isFetched) || pantryStatsLoading

    const goToPage = (page: number) => {
        const safe = Math.max(1, Math.min(totalPages, page))
        setPagination({ filterKey, offset: (safe - 1) * PAGE_SIZE })
    }

    return (
        <div className="min-h-screen bg-canvas">
            <div className="px-4 md:px-8 pt-5 pb-5 flex items-start justify-between border-b border-line/60 gap-4">
                <div className="flex items-center gap-3">
                    <button
                        className="md:hidden p-2 -ml-1 rounded-lg text-fg-muted hover:bg-canvas-hover-alt"
                        onClick={() => setMobileSidebar(true)}
                    >
                        <Menu size={20} />
                    </button>
                    <div>
                        <h1 className="font-headline text-3xl md:text-4xl text-fg leading-tight">
                            My <em className="italic text-brand-soft-strong" style={{ fontStyle: 'italic' }}>Pantry</em>
                        </h1>
                        <p className="mt-0.5 text-xs md:text-sm text-fg-muted">
                            Track what&apos;s at home. Keep cocktails makeable.
                        </p>
                    </div>
                </div>
                <div className="hidden sm:flex items-end gap-5 md:gap-8 shrink-0">
                    <StatChip value={isInitialLoad ? '-' : String(stats.total)} label="Items" color="text-fg" />
                    <StatChip value={isInitialLoad ? '-' : String(stats.low)} label="Low" color="text-brand-soft-strong" />
                    <StatChip value={isInitialLoad ? '-' : String(stats.out)} label="Out" color="text-warning" />
                    <StatChip value={isInitialLoad ? '-' : String(stats.toBuy)} label="To Buy" color="text-fg" />
                </div>
            </div>

            <div className="flex min-h-[calc(100vh-88px)]">
                <PantrySidebar
                    categories={categories}
                    pantryCount={pantryStats?.total ?? 0}
                    shoppingCount={pantryStats?.toBuy ?? 0}
                    selectedStatus={scopeFilter}
                    onStatusSelect={(status) => filters.set('status', status === 'all' ? null : status)}
                    selectedCategory={selectedCategory}
                    onCategorySelect={(category) => filters.set('category', category)}
                    mobileOpen={mobileSidebar}
                    onMobileClose={() => setMobileSidebar(false)}
                />

                <main className="flex-1 px-4 md:px-6 py-5 min-w-0">
                    <PantryFilterBar
                        filters={filters}
                        sortOption={sortOption}
                        scopeFilter={scopeFilter}
                        stockStatusFilter={stockStatusFilter}
                        search={search}
                        favoritesOnly={favoritesOnly}
                        selectedCategory={selectedCategory}
                        onAddClick={() => setOpenAdd(true)}
                        onRestockClick={() => setOpenRestock(true)}
                        restockCount={restockItems.length}
                    />

                    <PantryTable
                        items={pageItems}
                        statusFilter={scopeFilter}
                        loading={loading}
                        isFetching={isFetching}
                        search={search}
                        hasActiveFilter={hasActiveFilter}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        canPrev={canPrev}
                        canNext={canNext}
                        onFirst={() => goToPage(1)}
                        onPrev={() => goToPage(currentPage - 1)}
                        onNext={() => goToPage(currentPage + 1)}
                        onLast={() => goToPage(totalPages)}
                        onDeleted={handleDeleted}
                        onItemUpdated={handleItemUpdated}
                        onUpdated={handleReload}
                    />
                </main>
            </div>

            <AddPantryItemDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={handleReload} />
            <RestockPantryDialog
                open={openRestock}
                onOpenChange={setOpenRestock}
                items={restockItems}
                onRestocked={handleReload}
            />
        </div>
    )
}

function StatChip({ value, label, color }: { value: string; label: string; color: string }) {
    return (
        <div className="text-center">
            <div className={`text-2xl md:text-3xl font-headline italic leading-none ${color}`}>{value}</div>
            <div className="mt-1 text-[10px] font-label uppercase tracking-widest text-fg-muted">{label}</div>
        </div>
    )
}
