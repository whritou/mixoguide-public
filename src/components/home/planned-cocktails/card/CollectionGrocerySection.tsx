import { AlertTriangle, Check, ChevronDown, ChevronUp, Package, Printer, ShoppingCart } from 'lucide-react'
import type { GroceryItem } from '@/utils/groceryCalculator'

export type GroceryStatusCounts = {
    inStock: number
    inList: number
    partial: number
    missing: number
}

export function getCollectionGroceryStatusCounts(items: GroceryItem[]): GroceryStatusCounts {
    return {
        inStock: items.filter((item) => item.missing === 0).length,
        inList: items.filter((item) => item.missing > 0 && item.inWishlist).length,
        partial: items.filter((item) => item.missing > 0 && item.inPantry > 0 && !item.inWishlist).length,
        missing: items.filter((item) => item.missing > 0 && item.inPantry === 0 && !item.inWishlist).length,
    }
}

type CollectionGrocerySectionProps = {
    items: GroceryItem[]
    loading: boolean
    open: boolean
    statusCounts: GroceryStatusCounts
    onToggle: () => void
    collectionId: string
}

export function CollectionGrocerySection({
    items,
    loading,
    open,
    statusCounts,
    onToggle,
    collectionId,
}: CollectionGrocerySectionProps) {
    const missingCount = statusCounts.missing + statusCounts.partial

    const hasItems = items.length > 0

    return (
        <div>
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex items-center gap-1 text-xs text-mg-muted hover:text-mg-brown transition-colors"
                >
                    {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    <ShoppingCart size={11} />
                    Grocery list
                    {loading && !hasItems && (
                        <span className="ml-1 text-[10px] text-mg-muted italic">loading…</span>
                    )}
                    {hasItems && missingCount > 0 && (
                        <span className="ml-1 text-[10px] font-label bg-mg-danger-light text-mg-danger rounded-full px-1.5 py-0.5">
                            {missingCount} missing
                        </span>
                    )}
                    {hasItems && missingCount === 0 && (
                        <span className="ml-1 text-[10px] font-label bg-mg-brown/10 text-mg-brown rounded-full px-1.5 py-0.5">
                            All stocked
                        </span>
                    )}
                </button>

                {hasItems && (
                    <a
                        href={`/api/planned-collections/${collectionId}/grocery/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-mg-bone bg-white text-[10px] font-label uppercase tracking-widest text-mg-brown hover:bg-mg-sand/60 hover:border-mg-brown/30 transition-colors shadow-sm shrink-0"
                        aria-label="Download shopping list as PDF"
                        title="Download shopping list as PDF"
                    >
                        <Printer size={11} />
                        Download PDF
                    </a>
                )}
            </div>

            {open && items.length > 0 && (
                <div className="mt-2 space-y-1">
                    {items.map((item) => (
                        <div key={item.ingredientId} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        item.missing === 0
                                            ? 'bg-mg-brown'
                                            : item.inWishlist
                                                ? 'bg-mg-caramel'
                                                : item.inPantry > 0
                                                    ? 'bg-amber-400'
                                                    : 'bg-mg-danger'
                                    }`}
                                />
                                <span className="truncate text-mg-charcoal">{item.ingredientName}</span>
                            </div>
                            <span className="font-mono text-mg-muted shrink-0">
                                {item.missing > 0
                                    ? <span className="text-mg-danger">-{item.missing}{item.unit}</span>
                                    : <span className="text-mg-brown flex items-center gap-0.5"><Check size={9} />{item.inPantry}{item.unit}</span>
                                }
                            </span>
                        </div>
                    ))}

                    <div className="flex items-center gap-3 pt-1 text-xs text-mg-muted">
                        {statusCounts.missing > 0 && (
                            <span className="flex items-center gap-1 text-mg-danger">
                                <AlertTriangle size={10} />
                                {statusCounts.missing} missing
                            </span>
                        )}

                        {statusCounts.partial > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                                <Package size={10} />
                                {statusCounts.partial} partial
                            </span>
                        )}

                        {statusCounts.inList > 0 && (
                            <span className="flex items-center gap-1 text-mg-caramel">
                                <ShoppingCart size={10} />
                                {statusCounts.inList} in list
                            </span>
                        )}

                        {statusCounts.inStock > 0 && (
                            <span className="flex items-center gap-1 text-mg-brown">
                                <Check size={10} />
                                {statusCounts.inStock} stocked
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
