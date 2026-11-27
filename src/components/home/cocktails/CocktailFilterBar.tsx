'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Search, SlidersHorizontal, Star, X } from 'lucide-react'
import clsx from 'clsx'
import { COCKTAIL_DIFFICULTIES } from '@/types/models/cocktail'
import { FilterChipPanel } from './FilterChipPanel'
import { MobileFilterSheet } from './MobileFilterSheet'
import type { useFilters } from '@/hooks/useFilters'

const SORT_OPTIONS = [
    { label: 'Highest rated', sortBy: 'avgRating',       sortOrder: 'desc' },
    { label: 'Most popular',  sortBy: 'ratingCount',     sortOrder: 'desc' },
    { label: 'Quickest',      sortBy: 'preparationTime', sortOrder: 'asc'  },
    { label: 'Newest',        sortBy: 'createdAt',       sortOrder: 'desc' },
    { label: 'A - Z',         sortBy: 'name',            sortOrder: 'asc'  },
] as const

type FilterPanelKey = 'flavor' | 'ingredient' | 'occasion' | 'difficulty' | 'abv' | 'sort'

function formatLabel(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface Props {
    filters: ReturnType<typeof useFilters>
    isAuthenticated: boolean
    ingredientOpts: { id: string; name: string }[]
}

export function CocktailFilterBar({ filters, isAuthenticated, ingredientOpts }: Props) {
    const [openPanel,        setOpenPanel]        = useState<FilterPanelKey | null>(null)
    const [showDifficultyMenu, setShowDifficultyMenu] = useState(false)
    const [showAbvMenu, setShowAbvMenu] = useState(false)
    const [showSortMenu, setShowSortMenu] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const barRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

    const p = filters.params

    const flavorCount    = (p.get('flavors')     ?? '').split(',').filter(Boolean).length
    const ingredientCount = (p.get('ingredients') ?? '').split(',').filter(Boolean).length
    const occasionCount  = (p.get('occasions')   ?? '').split(',').filter(Boolean).length
    const difficultyCount = (p.get('difficulty') ?? '').split(',').filter(Boolean).length
    const abvActive = p.get('alcoholic') != null && p.get('alcoholic') !== 'any'
    const onlyMakeable = p.get('onlyMakeable') === 'true'
    const onlyFavorites = p.get('onlyFavorites') === 'true'
    const abvValue = p.get('alcoholic') ?? 'any'
    const totalActiveFilters = flavorCount + ingredientCount + occasionCount + difficultyCount + (abvActive ? 1 : 0) + (onlyMakeable ? 1 : 0) + (onlyFavorites ? 1 : 0)

    const difficultyValues = (p.get('difficulty') ?? '').split(',').filter(Boolean)
    const difficultyLabel  = difficultyValues.length === 1
        ? formatLabel(difficultyValues[0])
        : difficultyValues.length > 1 ? `${difficultyValues.length} selected` : 'Difficulty'
    const abvLabel = abvValue === 'true' ? 'Alcoholic' : abvValue === 'false' ? 'Non-alcoholic' : 'ABV'

    const currentSort = SORT_OPTIONS.find(
        s => s.sortBy === p.get('sortBy') && s.sortOrder === p.get('sortOrder')
    ) ?? SORT_OPTIONS[0]

    const setSort = (sortBy: string, sortOrder: string) => {
        const next = new URLSearchParams(searchParams.toString())
        next.set('sortBy', sortBy)
        next.set('sortOrder', sortOrder)
        router.push('?' + next.toString(), { scroll: false })
        setOpenPanel(null)
        setShowSortMenu(false)
    }

    const closeAll = () => {
        setShowDifficultyMenu(false)
        setShowAbvMenu(false)
        setShowSortMenu(false)
    }

    const toggle = (key: FilterPanelKey) => {
        closeAll()
        setOpenPanel(prev => (prev === key ? null : key))
    }

    const closeMobileSheet = () => {
        setMobileOpen(false)
    }

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (barRef.current && !barRef.current.contains(e.target as Node)) {
                setOpenPanel(null)
                closeAll()
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const pill = (label: string, key: FilterPanelKey, count = 0, forceActive = false) => (
        <button
            key={key}
            onClick={() => toggle(key)}
            className={clsx(
                'hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-label border transition-colors whitespace-nowrap',
                (openPanel === key || forceActive || count > 0)
                    ? 'border-brand bg-surface-subtle text-brand'
                    : 'border-line-strong bg-surface text-fg-secondary hover:bg-surface-hover-alt'
            )}
        >
            {label}
            {count > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-fg-on-brand">
                    {count}
                </span>
            )}
            <ChevronDown size={13} className={clsx('transition-transform', openPanel === key ? 'rotate-180' : '')} />
        </button>
    )

    return (
        <>
            <div ref={barRef} className="sticky top-0 md:top-[64px] z-[100] bg-canvas/95 backdrop-blur-md border-b border-line">
            <div className="px-4 md:px-12 py-3 flex items-center gap-2 md:flex-wrap">
                <div className="relative flex-1 md:flex-none">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                    <input
                        placeholder="Search cocktails..."
                        value={p.get('search') ?? ''}
                        onChange={e => filters.setDebounced('search', e.target.value || null)}
                        className="pl-8 pr-7 py-2 w-full md:w-94 rounded-full bg-line/50 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring border border-line-control"
                    />
                    {p.get('search') && (
                        <button
                            type="button"
                            onClick={() => filters.set('search', null)}
                            aria-label="Clear cocktail search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-secondary"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {isAuthenticated && (
                    <button
                        type="button"
                        onClick={() => filters.set('onlyFavorites', onlyFavorites ? null : 'true')}
                        title="Show favorites"
                        aria-label={onlyFavorites ? 'Show all cocktails' : 'Show favorite cocktails'}
                        aria-pressed={onlyFavorites}
                        className={clsx(
                            'hidden md:flex items-center justify-center w-9 h-9 rounded-full border transition-colors',
                            onlyFavorites
                                ? 'bg-surface-subtle border-brand-soft text-brand-soft-strong'
                                : 'border-line-strong bg-surface text-fg-muted hover:border-brand-soft hover:text-brand-soft-strong'
                        )}
                    >
                        <Star size={14} fill={onlyFavorites ? 'currentColor' : 'none'} />
                    </button>
                )}

                <div className="hidden md:block w-px h-5 bg-line flex-shrink-0" />

                {isAuthenticated && (
                    <button
                        onClick={() => filters.set('onlyMakeable', onlyMakeable ? null : 'true')}
                        className={clsx(
                            'hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-label border transition-colors whitespace-nowrap',
                            onlyMakeable
                                ? 'border-brand bg-surface-subtle text-brand'
                                : 'border-line-strong bg-surface text-fg-secondary hover:bg-surface-hover-alt'
                        )}
                    >
                        Ready to mix
                        <span className={clsx(
                            'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]',
                            onlyMakeable ? 'bg-brand text-fg-on-brand' : 'bg-line text-fg-muted'
                        )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {onlyMakeable ? 'on' : 'off'}
                        </span>
                    </button>
                )}

                {pill('Flavor', 'flavor', flavorCount)}
                {pill('Ingredient', 'ingredient', ingredientCount)}
                {pill('Occasion', 'occasion', occasionCount)}

                <div className="relative hidden md:block" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => {
                            setShowDifficultyMenu(v => !v)
                            setShowAbvMenu(false)
                            setShowSortMenu(false)
                            setOpenPanel(null)
                        }}
                        className={clsx(
                            'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm border transition-colors whitespace-nowrap',
                            (showDifficultyMenu || difficultyCount > 0)
                                ? 'border-brand bg-surface-subtle text-brand'
                                : 'border-line-strong bg-surface text-fg-secondary hover:bg-surface-hover-alt'
                        )}
                    >
                        {difficultyLabel}
                        <ChevronDown size={13} className={clsx('transition-transform', showDifficultyMenu ? 'rotate-180' : '')} />
                    </button>
                    {showDifficultyMenu && (
                        <div className="absolute left-0 top-full mt-1 z-[110] bg-surface rounded-xl shadow-lg border border-line py-1 min-w-[180px]">
                            <button
                                onClick={() => {
                                    filters.set('difficulty', null)
                                    setShowDifficultyMenu(false)
                                }}
                                className={clsx(
                                    'w-full text-left px-4 py-2 text-sm hover:bg-surface-hover-alt',
                                    difficultyCount === 0 ? 'text-brand font-medium' : 'text-fg-secondary'
                                )}
                            >
                                All
                            </button>
                            {COCKTAIL_DIFFICULTIES.map((d) => (
                                <button
                                    key={d}
                                    onClick={() => {
                                        filters.set('difficulty', d)
                                        setShowDifficultyMenu(false)
                                    }}
                                    className={clsx(
                                        'w-full text-left px-4 py-2 text-sm hover:bg-surface-hover-alt',
                                        difficultyValues.length === 1 && difficultyValues[0] === d
                                            ? 'text-brand font-medium'
                                            : 'text-fg-secondary'
                                    )}
                                >
                                    {formatLabel(d)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative hidden md:block" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => {
                            setShowAbvMenu(v => !v)
                            setShowDifficultyMenu(false)
                            setShowSortMenu(false)
                            setOpenPanel(null)
                        }}
                        className={clsx(
                            'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm border transition-colors whitespace-nowrap',
                            (showAbvMenu || abvActive)
                                ? 'border-brand bg-surface-subtle text-brand'
                                : 'border-line-strong bg-surface text-fg-secondary hover:bg-surface-hover-alt'
                        )}
                    >
                        {abvLabel}
                        <ChevronDown size={13} className={clsx('transition-transform', showAbvMenu ? 'rotate-180' : '')} />
                    </button>
                    {showAbvMenu && (
                        <div className="absolute left-0 top-full mt-1 z-[110] bg-surface rounded-xl shadow-lg border border-line py-1 min-w-[180px]">
                            {[
                                { label: 'All', value: 'any' },
                                { label: 'Alcoholic', value: 'true' },
                                { label: 'Non-alcoholic', value: 'false' },
                            ].map(({ label, value }) => (
                                <button
                                    key={value}
                                    onClick={() => {
                                        filters.set('alcoholic', value === 'any' ? null : value)
                                        setShowAbvMenu(false)
                                    }}
                                    className={clsx(
                                        'w-full text-left px-4 py-2 text-sm hover:bg-surface-hover-alt',
                                        (abvValue === value || (value === 'any' && !abvActive))
                                            ? 'text-brand font-medium'
                                            : 'text-fg-secondary'
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative ml-auto flex-shrink-0 hidden md:block" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => {
                            setShowSortMenu(v => !v)
                            setShowDifficultyMenu(false)
                            setShowAbvMenu(false)
                            setOpenPanel(null)
                        }}
                        className={clsx(
                            'flex items-center gap-1.5 text-sm transition-colors whitespace-nowrap',
                            showSortMenu ? 'text-fg font-medium' : 'text-fg-muted hover:text-fg'
                        )}
                    >
                        <span className="font-normal text-fg-muted">Sort</span>
                        <span>·</span>
                        <span className="font-medium">{currentSort.label}</span>
                        <ChevronDown size={13} className={clsx('transition-transform', showSortMenu ? 'rotate-180' : '')} />
                    </button>
                    {showSortMenu && (
                        <div className="absolute right-0 top-full mt-1 z-[110] bg-surface rounded-xl shadow-lg border border-line py-1 min-w-[200px]">
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt.label}
                                    onClick={() => setSort(opt.sortBy, opt.sortOrder)}
                                    className={clsx(
                                        'w-full text-left px-4 py-2 text-sm hover:bg-surface-hover-alt',
                                        currentSort.label === opt.label ? 'text-brand font-medium' : 'text-fg-secondary'
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

            </div>

                <FilterChipPanel
                    openPanel={openPanel}
                    filters={filters}
                    ingredientOpts={ingredientOpts}
                />
            </div>

            {!mobileOpen && (
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open cocktail filters"
                    className="md:hidden fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] z-[120] inline-flex items-center gap-2 px-4 py-3 rounded-full bg-surface-inverse text-fg-on-inverse inset-ring-1 inset-ring-fg/40 shadow-[0_10px_24px_rgba(27,28,26,0.28)]"
                >
                    <SlidersHorizontal size={15} />
                    <span className="font-label text-[11px] uppercase tracking-widest">Filters</span>
                    {totalActiveFilters > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-fg-on-brand">
                            {totalActiveFilters}
                        </span>
                    )}
                </button>
            )}

            <MobileFilterSheet
                open={mobileOpen}
                onClose={closeMobileSheet}
                filters={filters}
                isAuthenticated={isAuthenticated}
                ingredientOpts={ingredientOpts}
                currentSort={currentSort}
                setSort={setSort}
            />
        </>
    )
}
