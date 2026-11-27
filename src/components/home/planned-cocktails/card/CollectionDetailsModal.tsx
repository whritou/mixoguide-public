'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import {
    X,
    CalendarDays,
    MapPin,
    Users,
    FlaskConical,
    ShoppingCart,
    AlertTriangle,
    Check,
    Package,
    Printer,
    Tag,
    ChevronRight,
    Search,
    Plus,
    Trash2,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCocktailsQuery } from '@/hooks/queries/use-cocktails'
import { usePlannedCollectionMutations } from '@/hooks/mutations/use-planned-collection-mutations'
import type { PlannedCollection } from '@/types/models/planned-collection'
import type { GroceryItem } from '@/utils/groceryCalculator'
import type { GroceryStatusCounts } from '@/components/home/planned-cocktails/card/CollectionGrocerySection'

interface Props {
    item: PlannedCollection
    groceryItems: GroceryItem[]
    groceryLoading: boolean
    statusCounts: GroceryStatusCounts
    onClose: () => void
    onManageIngredients: () => void | Promise<void>
    onCollectionUpdated: () => void
    onMarkCocktailDone: (cocktailId: string, name: string) => void
    completingCocktailId?: string | null
}

const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export default function CollectionDetailsModal({
    item,
    groceryItems,
    groceryLoading,
    statusCounts,
    onClose,
    onManageIngredients,
    onCollectionUpdated,
    onMarkCocktailDone,
    completingCocktailId,
}: Props) {
    const { addCocktail, removeCocktail } = usePlannedCollectionMutations()
    const [cocktailSearch, setCocktailSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [searchFocused, setSearchFocused] = useState(false)
    const [addingCocktailId, setAddingCocktailId] = useState<string | null>(null)
    const [removingCocktailId, setRemovingCocktailId] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    const date = new Date(item.plannedFor)
    const dateLabel = date.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    const showTime = date.getHours() !== 12 || date.getMinutes() !== 0
    const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    const missing = groceryItems.filter(g => g.missing > 0 && g.inPantry === 0 && !g.inWishlist)
    const partial = groceryItems.filter(g => g.missing > 0 && g.inPantry > 0 && !g.inWishlist)
    const inList = groceryItems.filter(g => g.inWishlist)
    const stocked = groceryItems.filter(g => g.missing === 0)

    const totalMissingCount = statusCounts.missing + statusCounts.partial
    const canManageIngredients = item.status !== 'done' && item.cocktails.length > 0
    const canEditCocktails = item.status !== 'done'

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(cocktailSearch.trim())
        }, 250)
        return () => window.clearTimeout(timer)
    }, [cocktailSearch])

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    const searchParams = useMemo(
        () => debouncedSearch ? { search: debouncedSearch, limit: 20 } : { limit: 20 },
        [debouncedSearch],
    )
    const { data: cocktailData, isLoading: searchingCocktails } = useCocktailsQuery(searchParams)
    const searchPending = cocktailSearch.trim() !== debouncedSearch

    const existingCocktailIds = useMemo(
        () => new Set(item.cocktails.map((entry) => entry.cocktailId)),
        [item.cocktails],
    )
    const searchResults = useMemo(
        () => (cocktailData?.items ?? []).filter(c => !existingCocktailIds.has(c.id)),
        [cocktailData?.items, existingCocktailIds],
    )
    const showSearchDropdown = canEditCocktails && searchFocused && searchResults.length > 0

    const handleAddCocktail = async (cocktailId: string, cocktailName: string) => {
        setAddingCocktailId(cocktailId)
        try {
            await addCocktail.mutateAsync({ id: item.id, cocktailId })
            toast.success(`Added "${cocktailName}"`)
            setCocktailSearch('')
            onCollectionUpdated()
        } catch {
            toast.error('Could not add cocktail')
        } finally {
            setAddingCocktailId(null)
        }
    }

    const handleRemoveCocktail = async (cocktailId: string, cocktailName: string) => {
        setRemovingCocktailId(cocktailId)
        try {
            await removeCocktail.mutateAsync({ id: item.id, cocktailId })
            toast.success(`Removed "${cocktailName}"`)
            onCollectionUpdated()
        } catch {
            toast.error('Could not remove cocktail')
        } finally {
            setRemovingCocktailId(null)
        }
    }

    if (!mounted) return null

    return createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center overflow-hidden bg-overlay/67 p-4 backdrop-blur-sm cursor-default"
            style={{ zIndex: 9999 }}
            onClick={(e) => {
                e.stopPropagation()
                onClose()
            }}
        >
            <div
                className="flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-canvas shadow-2xl cursor-default"
                style={{ maxHeight: 'calc(100vh - 2rem)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 shrink-0 border-b border-line-strong/50">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-label uppercase tracking-widest text-brand mb-1">
                            Event details
                        </p>
                        <h2 className="font-headline italic text-2xl text-fg leading-tight">
                            {item.title}
                        </h2>
                        <div className="flex items-center gap-3 flex-wrap text-xs text-fg-muted mt-2">
                            <span className="flex items-center gap-1">
                                <CalendarDays size={12} />
                                {showTime ? `${dateLabel} at ${timeLabel}` : dateLabel}
                            </span>
                            {item.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    {item.location}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Users size={12} />
                                {item.servings} serving{item.servings !== 1 ? 's' : ''}
                            </span>
                            {item.shareEnabled && (item.rsvpGoingCount ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-brand font-medium">
                                    <Users size={12} />
                                    {item.rsvpGoingCount} going
                                </span>
                            )}
                        </div>

                        {item.occasions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {item.occasions.map(occ => (
                                    <span
                                        key={occ}
                                        className="inline-flex items-center gap-1 text-[10px] font-label uppercase tracking-widest px-2 py-0.5 rounded-full bg-line text-fg-secondary"
                                    >
                                        <Tag size={8} />
                                        {formatLabel(occ)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 p-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-line/60 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-6">
                    <section>
                        <header className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-label uppercase tracking-widest text-brand flex items-center gap-1.5">
                                <FlaskConical size={11} />
                                Cocktails
                            </h3>
                            <span className="text-xs text-fg-muted">
                                {item.cocktails.length} drink{item.cocktails.length !== 1 ? 's' : ''}
                            </span>
                        </header>

                        {canEditCocktails && (
                            <div className="mb-3">
                                <div className="relative">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                                    <input
                                        type="text"
                                        value={cocktailSearch}
                                        onChange={(e) => setCocktailSearch(e.target.value)}
                                        onFocus={() => setSearchFocused(true)}
                                        onBlur={() => setSearchFocused(false)}
                                        placeholder="Search cocktails to add..."
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>

                                {showSearchDropdown && (
                                    <div className="mt-1 bg-surface border border-line-strong rounded-xl shadow-md overflow-hidden">
                                        {searchResults.slice(0, 20).map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => void handleAddCocktail(c.id, c.name)}
                                                disabled={addingCocktailId === c.id}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:bg-brand-soft/10 transition-colors text-left disabled:opacity-50"
                                            >
                                                <Plus size={12} className="text-brand shrink-0" />
                                                {addingCocktailId === c.id ? 'Adding...' : c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {(searchingCocktails || searchPending) && searchFocused && (
                                    <p className="mt-1 text-xs text-fg-muted">Searching...</p>
                                )}
                            </div>
                        )}

                        {item.cocktails.length === 0 ? (
                            <EmptyState
                                icon={FlaskConical}
                                heading="No cocktails yet"
                                body="Search above to add drinks to this event."
                                size="card"
                            />
                        ) : (
                            <ul className="space-y-2">
                                {item.cocktails.map(c => (
                                    <li
                                        key={c.id}
                                        className="rounded-xl border border-line bg-surface transition-colors hover:border-brand/30 hover:bg-line/40"
                                    >
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <Link
                                                href={`/cocktails/${c.cocktailId}`}
                                                className="flex items-center gap-3 min-w-0 flex-1"
                                            >
                                                <div className="relative w-10 h-10 rounded-lg bg-line overflow-hidden shrink-0">
                                                    <Image
                                                        src={c.cocktail?.imageUrl ?? '/placeholder.svg'}
                                                        alt={c.cocktail?.name ?? 'Cocktail'}
                                                        fill
                                                        className="object-cover"
                                                        sizes="40px"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm text-fg truncate">
                                                        {c.cocktail?.name ?? '-'}
                                                    </p>
                                                    {c.cocktail?.difficulty && (
                                                        <p className="text-[10px] text-fg-muted uppercase tracking-widest font-label mt-0.5">
                                                            {c.cocktail.difficulty}
                                                        </p>
                                                    )}
                                                </div>
                                                <ChevronRight size={14} className="shrink-0 text-fg-muted" />
                                            </Link>

                                        </div>
                                        {item.status === 'done' || c.status === 'done' ? (
                                            <div className="px-3 pb-2 -mt-1 flex justify-end">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-label uppercase tracking-widest px-2 py-1 rounded-full bg-brand/10 text-brand">
                                                    <Check size={11} />
                                                    Made
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="px-3 pb-2 -mt-1 flex justify-end gap-2">
                                                {canEditCocktails && (
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleRemoveCocktail(c.cocktailId, c.cocktail?.name ?? 'Cocktail')}
                                                        disabled={removingCocktailId === c.cocktailId || completingCocktailId === c.cocktailId}
                                                        className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface px-2.5 py-1.5 text-[10px] font-label uppercase tracking-widest text-danger hover:bg-danger-bg disabled:opacity-50"
                                                    >
                                                        <Trash2 size={11} />
                                                        {removingCocktailId === c.cocktailId ? 'Removing' : 'Remove'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => onMarkCocktailDone(c.cocktailId, c.cocktail?.name ?? 'Cocktail')}
                                                    disabled={completingCocktailId === c.cocktailId || removingCocktailId === c.cocktailId}
                                                    className="inline-flex items-center gap-1 text-[10px] font-label uppercase tracking-widest px-2.5 py-1.5 rounded-full bg-line/70 text-fg-secondary hover:bg-brand/10 hover:text-brand transition-colors disabled:opacity-50"
                                                >
                                                    <Check size={11} />
                                                    {completingCocktailId === c.cocktailId ? 'Saving' : 'Mark made'}
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        <header className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-label uppercase tracking-widest text-brand flex items-center gap-1.5">
                                <ShoppingCart size={11} />
                                Shopping list
                            </h3>
                            {totalMissingCount > 0 && (
                                <span className="text-[10px] font-label uppercase tracking-widest text-danger bg-danger-bg rounded-full px-2 py-0.5">
                                    {totalMissingCount} missing
                                </span>
                            )}
                        </header>

                        {groceryLoading && groceryItems.length === 0 ? (
                            <p className="text-xs text-fg-muted italic py-4 text-center">Loading...</p>
                        ) : groceryItems.length === 0 ? (
                            <EmptyState icon={ShoppingCart} heading="Nothing to buy" body="Your pantry already has everything." size="card" />
                        ) : (
                            <div className="space-y-4">
                                {missing.length > 0 && (
                                    <GroceryGroup
                                        icon={AlertTriangle}
                                        iconColor="text-danger"
                                        label="To buy"
                                        items={missing}
                                        variant="missing"
                                    />
                                )}
                                {partial.length > 0 && (
                                    <GroceryGroup
                                        icon={Package}
                                        iconColor="text-warning"
                                        label="Partial in pantry"
                                        items={partial}
                                        variant="partial"
                                    />
                                )}
                                {inList.length > 0 && (
                                    <GroceryGroup
                                        icon={ShoppingCart}
                                        iconColor="text-brand-soft"
                                        label="Already in shopping list"
                                        items={inList}
                                        variant="list"
                                    />
                                )}
                                {stocked.length > 0 && (
                                    <GroceryGroup
                                        icon={Check}
                                        iconColor="text-brand"
                                        label="Already stocked"
                                        items={stocked}
                                        variant="stocked"
                                    />
                                )}
                            </div>
                        )}
                    </section>
                </div>

                <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-6 py-4 border-t border-line-strong/50 bg-surface/50">
                    {canManageIngredients && (
                        <button
                            type="button"
                            onClick={() => { void onManageIngredients() }}
                            disabled={groceryLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-label uppercase tracking-widest whitespace-nowrap rounded-full bg-line/60 text-fg-secondary hover:bg-brand-soft/20 hover:text-brand transition-colors disabled:opacity-40"
                        >
                            <ShoppingCart size={12} />
                            Manage ingredients
                        </button>
                    )}
                    <a
                        href={`/api/planned-collections/${item.id}/grocery/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-label uppercase tracking-widest rounded-full border border-line-strong bg-surface text-brand hover:bg-line/60 hover:border-brand/30 transition-colors shadow-sm"
                    >
                        <Printer size={12} />
                        Download PDF
                    </a>
                    <a
                        href={`/api/planned-collections/${item.id}/menu/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-label uppercase tracking-widest rounded-full border border-line-strong bg-surface text-brand hover:bg-line/60 hover:border-brand/30 transition-colors shadow-sm"
                    >
                        <Printer size={12} />
                        Print the menu
                    </a>
                </div>
            </div>
        </div>,
        document.body,
    )
}

function GroceryGroup({
    icon: Icon, iconColor, label, items, variant,
}: {
    icon: typeof AlertTriangle
    iconColor: string
    label: string
    items: GroceryItem[]
    variant: 'missing' | 'partial' | 'list' | 'stocked'
}) {
    return (
        <div>
            <h4 className="flex items-center gap-1.5 text-[10px] font-label uppercase tracking-widest text-fg-muted mb-1.5">
                <Icon size={11} className={iconColor} />
                {label}
                <span className="text-fg-muted/70">({items.length})</span>
            </h4>
            <ul className="rounded-xl border border-line bg-surface divide-y divide-line/70">
                {items.map(item => (
                    <li key={item.ingredientId} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                            <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    variant === 'missing' ? 'bg-danger'
                                        : variant === 'partial' ? 'bg-status-partial-dot'
                                            : variant === 'list' ? 'bg-brand-soft'
                                                : 'bg-brand'
                                }`}
                            />
                            <span className="text-fg-secondary truncate">{item.ingredientName}</span>
                        </div>
                        <span className="font-mono text-fg-muted shrink-0">
                            {variant === 'missing' || variant === 'partial'
                                ? <span className="text-danger font-medium">need {item.missing}{item.unit}</span>
                                : variant === 'list'
                                    ? <span className="text-brand-soft-strong">in list</span>
                                    : <span className="text-brand">{item.inPantry}{item.unit}</span>
                            }
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
