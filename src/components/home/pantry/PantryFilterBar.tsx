'use client';

import { useRef, useState } from 'react';
import { ChevronDown, PackagePlus, Plus, Search, Star, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { useFilters } from '@/hooks/useFilters';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
    SORT_LABELS, SORT_OPTIONS, SORT_PARAMS, STATUS_LABELS, STOCK_STATUS_FILTERS,
    type SortOption, type ScopeFilter, type StockStatusFilter,
} from './pantry.constants';

interface Props {
    filters:        ReturnType<typeof useFilters>;
    sortOption:     SortOption;
    scopeFilter:    ScopeFilter;
    stockStatusFilter: StockStatusFilter;
    search:         string;
    favoritesOnly:  boolean;
    selectedCategory: string | null;
    onAddClick:     () => void;
    onRestockClick: () => void;
    restockCount:   number;
}

export function PantryFilterBar({
    filters, sortOption, scopeFilter, stockStatusFilter, search,
    favoritesOnly, selectedCategory, onAddClick, onRestockClick, restockCount,
}: Props) {
    const router = useRouter();
    const [showSortMenu,   setShowSortMenu]   = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);

    const scopeActive = scopeFilter !== 'all';
    const stockActive = stockStatusFilter !== 'all';


    const closeDropdowns = () => {
        setShowSortMenu(false);
        setShowStatusMenu(false);
    };

    const setSort = (next: SortOption) => {
        const { sortBy, sortOrder } = SORT_PARAMS[next];
        const p = new URLSearchParams(filters.params.toString());
        p.set('sortBy', sortBy);
        p.set('sortOrder', sortOrder);
        router.push('?' + p.toString(), { scroll: false });
        setShowSortMenu(false);
    };

    const setStockStatus = (next: StockStatusFilter) => {
        const p = new URLSearchParams(filters.params.toString());
        const legacyStatus = p.get('status');
        if (legacyStatus && STOCK_STATUS_FILTERS.includes(legacyStatus as StockStatusFilter) && legacyStatus !== 'all') {
            p.delete('status');
        }
        if (next === 'all') p.delete('stockStatus');
        else p.set('stockStatus', next);
        router.push('?' + p.toString(), { scroll: false });
        setShowStatusMenu(false);
    };

    return (
        <>
            {/* ── Sticky filter bar ──────────────────────────────── */}
            <div
                className="sticky top-[0px] md:top-[72px] z-30 bg-canvas/95 backdrop-blur-sm border-b border-line/70 px-2 py-2 flex items-center gap-2 mb-4 flex-nowrap md:flex-wrap"
                onClick={closeDropdowns}
            >
                {/* Desktop search */}
                <div className="relative flex-shrink-0 hidden md:block">
                    <Search size={13} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
                    <input
                        type="search"
                        aria-label="Search pantry ingredients"
                        placeholder="Search ingredients..."
                        value={search}
                        onChange={e => filters.setDebounced('search', e.target.value || null)}
                        className="pl-8 pr-7 py-2 w-44 md:w-60 rounded-full bg-line/50 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring border border-line-control"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => filters.set('search', null)}
                            aria-label="Clear search"
                            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-h-6 min-w-6 p-1.5 rounded-full text-fg-muted hover:text-fg-secondary"
                        >
                            <X size={13} aria-hidden="true" />
                        </button>
                    )}
                </div>

                {/* Mobile search trigger */}
                <button
                    type="button"
                    onClick={() => setMobileSearchOpen(true)}
                    aria-label="Search ingredients"
                    aria-haspopup="dialog"
                    className={`md:hidden flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
                        search.trim()
                            ? 'bg-surface-subtle border-brand-soft text-brand-soft-strong'
                            : 'border-line-strong bg-surface text-fg-muted hover:border-brand-soft hover:text-brand-soft-strong'
                    }`}
                >
                    <Search size={14} aria-hidden="true" />
                </button>

                {/* Favorites toggle */}
                <button
                    type="button"
                    onClick={() => filters.set('favorite', favoritesOnly ? null : 'true')}
                    aria-label="Show favorites only"
                    aria-pressed={favoritesOnly}
                    className={`flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
                        favoritesOnly
                            ? 'bg-surface-subtle border-brand-soft text-brand-soft-strong'
                            : 'border-line-strong bg-surface text-fg-muted hover:border-brand-soft hover:text-brand-soft-strong'
                    }`}
                >
                    <Star size={14} aria-hidden="true" fill={favoritesOnly ? 'currentColor' : 'none'} />
                </button>

                <div aria-hidden="true" className="w-px h-5 bg-line flex-shrink-0" />

                {/* Status dropdown */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                        type="button"
                        aria-expanded={showStatusMenu}
                        onClick={() => { setShowStatusMenu(v => !v); setShowSortMenu(false); }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-colors ${
                            stockActive
                                ? 'border-brand bg-surface-subtle text-brand'
                                : 'border-line-strong bg-surface text-fg-secondary hover:bg-surface-hover-alt'
                        }`}
                    >
                        {stockActive ? STATUS_LABELS[stockStatusFilter] : 'Status'}
                        <ChevronDown size={14} aria-hidden="true" className={showStatusMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                    {showStatusMenu && (
                        <div className="absolute left-0 top-full mt-1 z-30 bg-surface rounded-xl shadow-lg border border-line py-1 min-w-[180px]">
                            {STOCK_STATUS_FILTERS.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    aria-pressed={stockStatusFilter === s}
                                    onClick={() => setStockStatus(s)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-hover-alt ${stockStatusFilter === s ? 'text-brand font-medium' : 'text-fg-secondary'}`}
                                >
                                    {STATUS_LABELS[s]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sort dropdown */}
                <div className="relative ml-2" onClick={e => e.stopPropagation()}>
                    <button
                        type="button"
                        aria-expanded={showSortMenu}
                        onClick={() => { setShowSortMenu(v => !v); setShowStatusMenu(false); }}
                        className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg transition-colors whitespace-nowrap"
                    >
                        <span className="md:hidden">Sort</span>
                        <span className="hidden md:inline">
                            Sort · <span className="font-medium">{SORT_LABELS[sortOption]}</span>
                        </span>
                        <ChevronDown size={14} aria-hidden="true" className={showSortMenu ? 'rotate-180 transition-transform ml-0.5' : 'transition-transform ml-0.5'} />
                    </button>
                    {showSortMenu && (
                        <div className="absolute left-0 top-full mt-1 z-30 bg-surface rounded-xl shadow-lg border border-line py-1 min-w-[200px]">
                            {SORT_OPTIONS.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    aria-pressed={sortOption === s}
                                    onClick={() => setSort(s)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-hover-alt ${sortOption === s ? 'text-brand font-medium' : 'text-fg-secondary'}`}
                                >
                                    {SORT_LABELS[s]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Restock button */}
                <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onRestockClick(); }}
                    disabled={restockCount === 0}
                    className="ml-auto shrink-0 flex items-center justify-center gap-2 h-9 w-9 md:h-auto md:w-auto md:px-4 md:py-2 rounded-full border border-brand-soft/40 bg-surface-subtle text-brand text-sm font-medium hover:bg-brand-soft/15 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                    aria-label={restockCount > 0 ? `Restock ${restockCount} low or empty pantry items` : 'No low or empty pantry items to restock'}
                    title={restockCount > 0 ? `Restock ${restockCount} item${restockCount !== 1 ? 's' : ''}` : 'All stocked up'}
                >
                    <PackagePlus size={15} aria-hidden="true" />
                    <span className="hidden sm:inline">
                        Restock{restockCount > 0 ? ` ${restockCount}` : ''}
                    </span>
                </button>

                {/* Add ingredient button */}
                <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onAddClick(); }}
                    className="shrink-0 flex items-center justify-center gap-2 h-9 w-9 md:h-auto md:w-auto md:px-5 md:py-2 rounded-full bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand text-sm font-medium hover:opacity-80 transition-opacity"
                    aria-label="Add ingredient"
                >
                    <Plus size={15} aria-hidden="true" />
                    <span className="hidden sm:inline">Add ingredient</span>
                </button>
            </div>

            {/* ── Active filter tags ──────────────────────────────── */}
            {(favoritesOnly || scopeActive || stockActive || !!selectedCategory) && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {favoritesOnly && (
                        <FilterTag label="Favorites" onRemove={() => filters.set('favorite', null)} />
                    )}
                    {scopeActive && (
                        <FilterTag label={STATUS_LABELS[scopeFilter]} onRemove={() => filters.set('status', null)} />
                    )}
                    {stockActive && (
                        <FilterTag label={STATUS_LABELS[stockStatusFilter]} onRemove={() => setStockStatus('all')} />
                    )}
                    {selectedCategory && (
                        <FilterTag label={selectedCategory} onRemove={() => filters.set('category', null)} />
                    )}
                </div>
            )}

            {/* ── Mobile search overlay ───────────────────────────── */}
            <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
                <DialogContent
                    showCloseButton={false}
                    aria-describedby={undefined}
                    overlayClassName="md:hidden bg-overlay/27 backdrop-blur-[1px]"
                    className="md:hidden left-3 right-3 top-4 w-auto max-w-none sm:max-w-none translate-x-0 translate-y-0 border-0 bg-transparent p-0 shadow-none gap-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
                    onOpenAutoFocus={(e) => {
                        e.preventDefault();
                        mobileSearchInputRef.current?.focus();
                    }}
                >
                    <DialogTitle className="sr-only">Search pantry ingredients</DialogTitle>
                        <div className="relative rounded-2xl border border-line-strong bg-canvas shadow-xl px-3 py-2.5">
                            <Search size={14} aria-hidden="true" className="absolute left-5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
                            <input
                                ref={mobileSearchInputRef}
                                type="search"
                                aria-label="Search pantry ingredients"
                                placeholder="Search ingredients..."
                                value={search}
                                onChange={e => filters.setDebounced('search', e.target.value || null)}
                                className="w-full pl-8 pr-8 py-1.5 bg-transparent text-sm text-fg placeholder:text-fg-muted rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (search) {
                                        filters.set('search', null);
                                    } else {
                                        setMobileSearchOpen(false);
                                    }
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-h-6 min-w-6 p-1.5 rounded-full text-fg-muted hover:text-fg-secondary"
                                aria-label={search ? 'Clear search' : 'Close search'}
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-subtle border border-line-strong text-xs text-brand">
            {label}
            <button type="button" onClick={onRemove} aria-label={`Remove ${label} filter`} className="-my-1 -mr-1.5 inline-flex items-center justify-center min-h-6 min-w-6 p-1.5 rounded-full hover:text-fg-secondary">
                <X size={11} aria-hidden="true" />
            </button>
        </span>
    );
}
