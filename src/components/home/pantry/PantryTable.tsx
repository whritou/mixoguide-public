'use client';

import Loader from '@/components/ui/Loader';
import PantryTableRow from './PantryTableRow';
import { PackageOpen, SearchX, ShoppingCart } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { UserPantryItem } from '@/types/models/pantry';
import type { ScopeFilter } from './pantry.constants';

interface Props {
    items:           UserPantryItem[];
    statusFilter:    ScopeFilter;
    loading:         boolean;
    isFetching:      boolean;
    search:          string;
    hasActiveFilter: boolean;
    totalItems:      number;
    pageSize:        number;
    currentPage:     number;
    totalPages:      number;
    canPrev:         boolean;
    canNext:         boolean;
    onFirst:         () => void;
    onPrev:          () => void;
    onNext:          () => void;
    onLast:          () => void;
    onDeleted:       (id: string) => void;
    onItemUpdated:   (id: string, updates: object) => void;
    onUpdated:       () => void;
}

export function PantryTable({
    items, statusFilter, loading, isFetching, search, hasActiveFilter,
    totalItems, pageSize, currentPage, totalPages, canPrev, canNext,
    onFirst, onPrev, onNext, onLast,
    onDeleted, onItemUpdated, onUpdated,
}: Props) {
    const qtyHeader = statusFilter === 'shopping' ? 'To buy' : 'Qty'

    if (loading && items.length === 0) {
        return <div className="flex justify-center py-20"><Loader /></div>;
    }

    if (items.length === 0) {
        return (
            <PantryEmptyState
                search={search}
                statusFilter={statusFilter}
                hasActiveFilter={hasActiveFilter}
            />
        );
    }

    return (
        <>
            <div className="rounded-2xl overflow-hidden border border-mg-sand/80">
                {/* Table header — desktop */}
                <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1.5fr_minmax(100px,1fr)_40px] gap-4 px-6 py-3 bg-[#f5f2ee]">
                    {['Ingredient', 'Type', 'Stock', qtyHeader].map(col => (
                        <div key={col} className={`text-[10px] font-label uppercase tracking-widest text-mg-muted ${col === qtyHeader ? 'text-right' : ''}`}>
                            {col}
                        </div>
                    ))}
                    <div />
                </div>

                {/* Table header — mobile */}
                <div className="sm:hidden grid grid-cols-[1fr_auto_32px] gap-3 px-4 py-2.5 bg-[#f5f2ee]">
                    <div className="text-[10px] font-label uppercase tracking-widest text-mg-muted">Ingredient</div>
                    <div className="text-[10px] font-label uppercase tracking-widest text-mg-muted text-right">{qtyHeader}</div>
                    <div />
                </div>

                <div className="divide-y divide-[#f0ece8]">
                    {items.map(item => (
                        <PantryTableRow
                            key={item.id}
                            item={item}
                            statusFilter={statusFilter}
                            onDeleted={onDeleted}
                            onItemUpdated={onItemUpdated}
                            onUpdated={onUpdated}
                        />
                    ))}
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-mg-muted">
                    Total items: <span className="font-medium text-mg-charcoal">{totalItems}</span>
                    {' · '}
                    Page <span className="font-medium text-mg-charcoal">{currentPage}</span> of <span className="font-medium text-mg-charcoal">{totalPages}</span>
                    {' · '}
                    {pageSize} per page
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onFirst}
                        disabled={!canPrev || isFetching}
                        className="px-3 py-2 rounded-full border border-mg-bone text-xs text-mg-charcoal hover:bg-mg-dusk transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        First
                    </button>
                    <button
                        onClick={onPrev}
                        disabled={!canPrev || isFetching}
                        className="px-3 py-2 rounded-full border border-mg-bone text-xs text-mg-charcoal hover:bg-mg-dusk transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <button
                        onClick={onNext}
                        disabled={!canNext || isFetching}
                        className="px-3 py-2 rounded-full border border-mg-bone text-xs text-mg-charcoal hover:bg-mg-dusk transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                    <button
                        onClick={onLast}
                        disabled={!canNext || isFetching}
                        className="px-3 py-2 rounded-full border border-mg-bone text-xs text-mg-charcoal hover:bg-mg-dusk transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Last
                    </button>
                    {isFetching && (
                        <div className="ml-2">
                            <Loader variant="spinner" />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function PantryEmptyState({
    search,
    statusFilter,
    hasActiveFilter,
}: {
    search: string;
    statusFilter: ScopeFilter;
    hasActiveFilter: boolean;
}) {
    const hasSearch = search.trim().length > 0;
    const isShopping = statusFilter === 'shopping';
    const Icon = hasActiveFilter ? SearchX : isShopping ? ShoppingCart : PackageOpen;

    const title = hasActiveFilter
        ? 'No matching items'
        : isShopping
            ? 'Shopping list is empty'
            : 'Your pantry is empty';

    const body = hasSearch
        ? <>No ingredients match <span className="font-medium text-mg-charcoal">{search.trim()}</span>.</>
        : hasActiveFilter
            ? 'Try changing or clearing the current filters.'
            : isShopping
                ? 'Ingredients you plan to buy will appear here.'
                : 'Add ingredients to start tracking what is available at home.';

    return <EmptyState icon={Icon} heading={title} body={body} bordered />;
}
