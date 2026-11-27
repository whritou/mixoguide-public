'use client'

import { useState, useRef, type TouchEvent } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import {
    COCKTAIL_FLAVORS,
    COCKTAIL_DIFFICULTIES,
    COCKTAIL_OCCASIONS,
} from '@/types/models/cocktail'
import type { useFilters } from '@/hooks/useFilters'

type FilterPanelKey = 'flavor' | 'ingredient' | 'occasion' | 'difficulty' | 'abv' | 'sort'

const SORT_OPTIONS = [
    { label: 'Highest rated', sortBy: 'avgRating',       sortOrder: 'desc' },
    { label: 'Most popular',  sortBy: 'ratingCount',     sortOrder: 'desc' },
    { label: 'Quickest',      sortBy: 'preparationTime', sortOrder: 'asc'  },
    { label: 'Newest',        sortBy: 'createdAt',       sortOrder: 'desc' },
    { label: 'A - Z',         sortBy: 'name',            sortOrder: 'asc'  },
] as const

function formatLabel(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function chipCls(active: boolean) {
    return clsx(
        'rounded-full px-3 py-1.5 text-xs font-label cursor-pointer transition-colors',
        active
            ? 'border border-brand bg-surface-subtle text-brand'
            : 'bg-surface text-fg-secondary border border-line-strong hover:bg-surface-hover-alt'
    )
}

interface MobileFilterSheetProps {
    open: boolean
    onClose: () => void
    filters: ReturnType<typeof useFilters>
    isAuthenticated: boolean
    ingredientOpts: { id: string; name: string }[]
    currentSort: typeof SORT_OPTIONS[number]
    setSort: (sortBy: string, sortOrder: string) => void
}

export function MobileFilterSheet({
    open,
    onClose,
    filters,
    isAuthenticated,
    ingredientOpts,
    currentSort,
    setSort,
}: MobileFilterSheetProps) {
    const [openSection, setOpenSection] = useState<FilterPanelKey | null>(null)
    const [offset,      setOffset]      = useState(0)
    const [dragging,    setDragging]    = useState(false)
    const startY = useRef<number | null>(null)

    const p = filters.params

    const onlyMakeable  = p.get('onlyMakeable') === 'true'
    const onlyFavorites = p.get('onlyFavorites') === 'true'

    const close = () => {
        onClose()
        setOpenSection(null)
        setOffset(0)
        setDragging(false)
        startY.current = null
    }

    const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        startY.current = e.touches[0]?.clientY ?? null
        setDragging(true)
    }

    const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (startY.current == null) return
        const delta = (e.touches[0]?.clientY ?? startY.current) - startY.current
        setOffset(delta > 0 ? Math.min(delta, 180) : 0)
    }

    const onTouchEnd = () => {
        if (offset > 90) { close(); return }
        setOffset(0)
        setDragging(false)
        startY.current = null
    }

    return (
        <Sheet open={open} onOpenChange={(o) => { if (!o) close() }}>
            <SheetContent
                side="bottom"
                showCloseButton={false}
                overlayClassName="z-[150] bg-overlay/53 backdrop-blur-sm md:hidden"
                className={clsx(
                    'z-[150] md:hidden block gap-0 border-0 bg-surface rounded-t-3xl p-6 max-h-[82vh] overflow-y-auto',
                    !dragging && 'transition-transform duration-200'
                )}
                style={{ transform: `translateY(${offset}px)` }}
            >
                <div
                    aria-hidden="true"
                    className="w-10 h-1.5 bg-line rounded-full mx-auto mb-5"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                />
                <div className="flex justify-between items-center mb-4">
                    <SheetTitle className="font-label text-base font-semibold">Filters</SheetTitle>
                    <button type="button" onClick={close} className="min-h-6 px-2 text-sm text-fg-muted hover:text-fg">Close</button>
                </div>
                <SheetDescription className="sr-only">Refine the cocktail list by search, flavor, occasion, difficulty, ingredient, ABV and sort order.</SheetDescription>

                <div className="space-y-5">
                    {/* Search */}
                    <div>
                        <label htmlFor="mobile-cocktail-search" className="text-[11px] font-label uppercase tracking-widest text-fg-muted">Search</label>
                        <div className="relative mt-2">
                            <Search size={13} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                            <input
                                id="mobile-cocktail-search"
                                type="search"
                                placeholder="Search cocktails..."
                                value={p.get('search') ?? ''}
                                onChange={e => filters.setDebounced('search', e.target.value || null)}
                                className="pl-8 pr-7 py-2 w-full rounded-full bg-line/50 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring border border-line-control"
                            />
                            {p.get('search') && (
                                <button
                                    type="button"
                                    aria-label="Clear search"
                                    onClick={() => filters.set('search', null)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-h-6 min-w-6 p-1.5 rounded-full text-fg-muted hover:text-fg-secondary"
                                >
                                    <X size={13} aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick toggles */}
                    {isAuthenticated && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                aria-pressed={onlyMakeable}
                                onClick={() => filters.set('onlyMakeable', onlyMakeable ? null : 'true')}
                                className={clsx(
                                    'rounded-xl border px-3 py-2 text-xs font-label uppercase tracking-wider',
                                    onlyMakeable ? 'border-brand bg-surface-subtle text-brand' : 'border-line-strong text-fg-secondary'
                                )}
                            >
                                Ready to mix
                            </button>
                            <button
                                type="button"
                                aria-pressed={onlyFavorites}
                                onClick={() => filters.set('onlyFavorites', onlyFavorites ? null : 'true')}
                                className={clsx(
                                    'rounded-xl border px-3 py-2 text-xs font-label uppercase tracking-wider',
                                    onlyFavorites ? 'border-brand-soft bg-surface-subtle text-brand' : 'border-line-strong text-fg-secondary'
                                )}
                            >
                                Favorites
                            </button>
                        </div>
                    )}

                    {/* Collapsible sections */}
                    {(
                        [
                            { key: 'flavor' as FilterPanelKey, label: 'Flavor', items: [...COCKTAIL_FLAVORS].sort(), param: 'flavors' },
                            { key: 'occasion' as FilterPanelKey, label: 'Occasion', items: [...COCKTAIL_OCCASIONS].sort(), param: 'occasions' },
                            { key: 'difficulty' as FilterPanelKey, label: 'Difficulty', items: [...COCKTAIL_DIFFICULTIES], param: 'difficulty' },
                        ] as const
                    ).map(({ key, label, items, param }) => (
                        <div key={key}>
                            <button
                                type="button"
                                aria-expanded={openSection === key}
                                onClick={() => setOpenSection(prev => prev === key ? null : key)}
                                className="w-full flex items-center justify-between"
                            >
                                <span className="text-[11px] font-label uppercase tracking-widest text-fg-muted">{label}</span>
                                <ChevronDown size={14} aria-hidden="true" className={clsx('transition-transform', openSection === key && 'rotate-180')} />
                            </button>
                            {openSection === key && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {items.map(item => (
                                        <button
                                            key={item}
                                            type="button"
                                            aria-pressed={(p.get(param) ?? '').split(',').includes(item)}
                                            className={chipCls((p.get(param) ?? '').split(',').includes(item))}
                                            onClick={() => filters.toggleCsvValue(param, item)}
                                        >
                                            {formatLabel(item)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Ingredients */}
                    <div>
                        <button
                            type="button"
                            aria-expanded={openSection === 'ingredient'}
                            onClick={() => setOpenSection(prev => prev === 'ingredient' ? null : 'ingredient')}
                            className="w-full flex items-center justify-between"
                        >
                            <span className="text-[11px] font-label uppercase tracking-widest text-fg-muted">Ingredient</span>
                            <ChevronDown size={14} aria-hidden="true" className={clsx('transition-transform', openSection === 'ingredient' && 'rotate-180')} />
                        </button>
                        {openSection === 'ingredient' && (
                            <div className="flex max-h-36 overflow-y-auto pr-1 flex-wrap gap-2 mt-2">
                                {[...ingredientOpts].sort((a, b) => a.name.localeCompare(b.name)).map(ing => (
                                    <button
                                        key={ing.id}
                                        type="button"
                                        aria-pressed={(p.get('ingredients') ?? '').split(',').includes(ing.name)}
                                        className={chipCls((p.get('ingredients') ?? '').split(',').includes(ing.name))}
                                        onClick={() => filters.toggleCsvValue('ingredients', ing.name)}
                                    >
                                        {ing.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ABV */}
                    <div>
                        <button
                            type="button"
                            aria-expanded={openSection === 'abv'}
                            onClick={() => setOpenSection(prev => prev === 'abv' ? null : 'abv')}
                            className="w-full flex items-center justify-between"
                        >
                            <span className="text-[11px] font-label uppercase tracking-widest text-fg-muted">ABV</span>
                            <ChevronDown size={14} aria-hidden="true" className={clsx('transition-transform', openSection === 'abv' && 'rotate-180')} />
                        </button>
                        {openSection === 'abv' && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {[
                                    { label: 'All',           value: 'any' },
                                    { label: 'Alcoholic',     value: 'true' },
                                    { label: 'Non-alcoholic', value: 'false' },
                                ].map(({ label, value }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={(p.get('alcoholic') ?? 'any') === value}
                                        className={chipCls((p.get('alcoholic') ?? 'any') === value)}
                                        onClick={() => filters.set('alcoholic', value === 'any' ? null : value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sort */}
                    <div>
                        <button
                            type="button"
                            aria-expanded={openSection === 'sort'}
                            onClick={() => setOpenSection(prev => prev === 'sort' ? null : 'sort')}
                            className="w-full flex items-center justify-between"
                        >
                            <span className="text-[11px] font-label uppercase tracking-widest text-fg-muted">Sort</span>
                            <ChevronDown size={14} aria-hidden="true" className={clsx('transition-transform', openSection === 'sort' && 'rotate-180')} />
                        </button>
                        {openSection === 'sort' && (
                            <div className="mt-2 space-y-1">
                                {SORT_OPTIONS.map(opt => (
                                    <button
                                        key={opt.label}
                                        type="button"
                                        aria-pressed={currentSort.label === opt.label}
                                        onClick={() => setSort(opt.sortBy, opt.sortOrder)}
                                        className={clsx(
                                            'w-full text-left px-3 py-2 rounded-lg text-sm',
                                            currentSort.label === opt.label
                                                ? 'bg-surface-subtle text-brand font-medium'
                                                : 'text-fg-secondary hover:bg-surface-hover-alt'
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => { filters.resetAll(); close() }}
                    >
                        Reset
                    </Button>
                    <Button className="flex-1 bg-brand hover:bg-brand/90" onClick={close}>
                        Done
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
