'use client';

import { useRef, useEffect, useState } from 'react';
import { ChevronDown, PackagePlus, Plus, Search, Star, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { useFilters } from '@/hooks/useFilters';
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

    /* Auto-focus mobile search input when overlay opens */
    useEffect(() => {
        if (!mobileSearchOpen) return;
        const id = window.setTimeout(() => mobileSearchInputRef.current?.focus(), 20);
        return () => window.clearTimeout(id);
    }, [mobileSearchOpen]);

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
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search ingredients..."
                        value={search}
                        onChange={e => filters.setDebounced('search', e.target.value || null)}
                        className="pl-8 pr-7 py-2 w-44 md:w-60 rounded-full bg-line/50 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring border border-line-control"
                    />
                    {search && (
                        <button
                            onClick={() => filters.set('search', null)}
                            aria-label="Clear search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-secondary"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Mobile search trigger */}
                <button
                    onClick={() => setMobileSearchOpen(true)}
                    aria-label="Search ingredients"
                    className={`md:hidden flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
                        search.trim()
                            ? 'bg-surface-subtle border-brand-soft text-brand-soft-strong'
                            : 'border-line-strong bg-surface text-fg-muted hover:border-brand-soft hover:text-brand-soft-strong'
                    }`}
                >
                    <Search size={14} />
                </button>

                {/* Favorites toggle */}
                <button
                    onClick={() => filters.set('favorite', favoritesOnly ? null : 'true')}
                    aria-label={favoritesOnly ? 'Show all ingredients' : 'Show favorites only'}
                    className={`flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
                        favoritesOnly
                            ? 'bg-surface-subtle border-brand-soft text-brand-soft-strong'
                            : 'border-line-strong bg-surface text-fg-muted hover:border-brand-soft hover:text-brand-soft-strong'
                    }`}
                >
                    <Star size={14} fill={favoritesOnly ? 'currentColor' : 'none'} />
                </button>

                <div className="w-px h-5 bg-line flex-shrink-0" />

                {/* Status dropdown */}
                <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => { setShowStatusMenu(v => !v); setShowSortMenu(false); }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-colors ${
                            stockActive
                                ? 'border-brand bg-surface-subtle text-brand'
                                : 'border-line-strong bg-surface text-fg-secondary hover:bg-surface-hover-alt'
                        }`}
                    >
                        {stockActive ? STATUS_LABELS[stockStatusFilter] : 'Status'}
                        <ChevronDown size={14} className={showStatusMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                    {showStatusMenu && (
                        <div className="absolute left-0 top-full mt-1 z-30 bg-surface rounded-xl shadow-lg border border-line py-1 min-w-[180px]">
                            {STOCK_STATUS_FILTERS.map((s) => (
                                <button
                                    key={s}
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
                        onClick={() => { setShowSortMenu(v => !v); setShowStatusMenu(false); }}
                        className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg transition-colors whitespace-nowrap"
                    >
                        <span className="md:hidden">Sort</span>
                        <span className="hidden md:inline">
                            Sort · <span className="font-medium">{SORT_LABELS[sortOption]}</span>
                        </span>
                        <ChevronDown size={14} className={showSortMenu ? 'rotate-180 transition-transform ml-0.5' : 'transition-transform ml-0.5'} />
                    </button>
                    {showSortMenu && (
                        <div className="absolute left-0 top-full mt-1 z-30 bg-surface rounded-xl shadow-lg border border-line py-1 min-w-[200px]">
                            {SORT_OPTIONS.map(s => (
                                <button
                                    key={s}
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
                    onClick={e => { e.stopPropagation(); onRestockClick(); }}
                    disabled={restockCount === 0}
                    className="ml-auto shrink-0 flex items-center justify-center gap-2 h-9 w-9 md:h-auto md:w-auto md:px-4 md:py-2 rounded-full border border-brand-soft/40 bg-surface-subtle text-brand text-sm font-medium hover:bg-brand-soft/15 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                    aria-label={restockCount > 0 ? `Restock ${restockCount} low or empty pantry items` : 'No low or empty pantry items to restock'}
                    title={restockCount > 0 ? `Restock ${restockCount} item${restockCount !== 1 ? 's' : ''}` : 'All stocked up'}
                >
                    <PackagePlus size={15} />
                    <span className="hidden sm:inline">
                        Restock{restockCount > 0 ? ` ${restockCount}` : ''}
                    </span>
                </button>

                {/* Add ingredient button */}
                <button
                    onClick={e => { e.stopPropagation(); onAddClick(); }}
                    className="shrink-0 flex items-center justify-center gap-2 h-9 w-9 md:h-auto md:w-auto md:px-5 md:py-2 rounded-full bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand text-sm font-medium hover:opacity-80 transition-opacity"
                    aria-label="Add ingredient"
                >
                    <Plus size={15} />
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
            {mobileSearchOpen && (
                <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileSearchOpen(false)}>
                    <div className="absolute inset-0 bg-overlay/27 backdrop-blur-[1px]" />
                    <div className="absolute left-3 right-3 top-4" onClick={e => e.stopPropagation()}>
                        <div className="relative rounded-2xl border border-line-strong bg-canvas shadow-xl px-3 py-2.5">
                            <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
                            <input
                                ref={mobileSearchInputRef}
                                type="text"
                                placeholder="Search ingredients..."
                                value={search}
                                onChange={e => filters.setDebounced('search', e.target.value || null)}
                                className="w-full pl-8 pr-8 py-1.5 bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-none"
                            />
                            <button
                                onClick={() => {
                                    if (search) {
                                        filters.set('search', null);
                                    } else {
                                        setMobileSearchOpen(false);
                                    }
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-secondary"
                                aria-label={search ? 'Clear search' : 'Close search'}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-subtle border border-line-strong text-xs text-brand">
            {label}
            <button onClick={onRemove} aria-label={`Remove ${label} filter`} className="hover:text-fg-secondary">
                <X size={11} />
            </button>
        </span>
    );
}
