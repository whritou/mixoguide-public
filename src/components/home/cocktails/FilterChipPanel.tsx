'use client'

import clsx from 'clsx'
import {
    COCKTAIL_FLAVORS,
    COCKTAIL_DIFFICULTIES,
    COCKTAIL_OCCASIONS,
} from '@/types/models/cocktail'
import type { useFilters } from '@/hooks/useFilters'

type FilterPanelKey = 'flavor' | 'ingredient' | 'occasion' | 'difficulty' | 'abv' | 'sort'

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

interface FilterChipPanelProps {
    openPanel: FilterPanelKey | null
    filters: ReturnType<typeof useFilters>
    ingredientOpts: { id: string; name: string }[]
}

export function FilterChipPanel({ openPanel, filters, ingredientOpts }: FilterChipPanelProps) {
    if (!openPanel) return null

    const p = filters.params

    return (
        <div className="hidden md:block px-4 md:px-12 py-4 bg-canvas-hover-alt border-t border-line" role="group" aria-label="Filter options">
            {openPanel === 'flavor' && (
                <div className="flex flex-wrap gap-2">
                    {[...COCKTAIL_FLAVORS].sort().map(fl => (
                        <button
                            key={fl}
                            type="button"
                            aria-pressed={(p.get('flavors') ?? '').split(',').includes(fl)}
                            className={chipCls((p.get('flavors') ?? '').split(',').includes(fl))}
                            onClick={() => filters.toggleCsvValue('flavors', fl)}
                        >
                            {formatLabel(fl)}
                        </button>
                    ))}
                </div>
            )}

            {openPanel === 'ingredient' && (
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-2">
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

            {openPanel === 'occasion' && (
                <div className="flex flex-wrap gap-2">
                    {[...COCKTAIL_OCCASIONS].sort().map(o => (
                        <button
                            key={o}
                            type="button"
                            aria-pressed={(p.get('occasions') ?? '').split(',').includes(o)}
                            className={chipCls((p.get('occasions') ?? '').split(',').includes(o))}
                            onClick={() => filters.toggleCsvValue('occasions', o)}
                        >
                            {formatLabel(o)}
                        </button>
                    ))}
                </div>
            )}

            {openPanel === 'difficulty' && (
                <div className="flex flex-wrap gap-2">
                    {COCKTAIL_DIFFICULTIES.map(d => (
                        <button
                            key={d}
                            type="button"
                            aria-pressed={(p.get('difficulty') ?? '').split(',').includes(d)}
                            className={chipCls((p.get('difficulty') ?? '').split(',').includes(d))}
                            onClick={() => filters.toggleCsvValue('difficulty', d)}
                        >
                            {formatLabel(d)}
                        </button>
                    ))}
                </div>
            )}

            {openPanel === 'abv' && (
                <div className="flex gap-2">
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
    )
}
