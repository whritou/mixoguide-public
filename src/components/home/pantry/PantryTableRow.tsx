'use client'

import { useState } from 'react'
import { MoreHorizontal, PackageCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePantryMutations } from '@/hooks/mutations/use-pantry-mutations'
import type { UserPantryItem } from '@/types/models/pantry'
import EditPantryItemDialog from './dialog/EditPantryItemDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { stockStatus, type ScopeFilter } from "@/components/home/pantry/pantry.constants";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const UNIT_MAX: Record<string, number> = {
    cl: 75, ml: 750, oz: 25, g: 500, pcs: 10, zest: 10, slice: 10, twist: 10,
}

function stockFill(qty: number, unit: string): number {
    return Math.min(qty / (UNIT_MAX[unit] ?? 20), 1)
}

interface Props {
    item:           UserPantryItem
    statusFilter:   ScopeFilter
    onDeleted?:     (id: string) => void
    onItemUpdated?: (id: string, updates: Partial<UserPantryItem>) => void
    onUpdated?:     () => void
}

export default function PantryTableRow({ item, statusFilter, onDeleted, onItemUpdated, onUpdated }: Props) {
    const { update, moveToPantry, remove } = usePantryMutations()
    const [editOpen, setEditOpen]     = useState(false)
    const [menuOpen, setMenuOpen]     = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [busy, setBusy]             = useState(false)
    const isShoppingView = statusFilter === 'shopping'

    const ing         = item.ingredient
    const inPantry    = item.isInPantry
    const infinite    = !!item.isInfinite
    const stock       = inPantry ? (infinite ? 'ok' : stockStatus(item.quantity, item.unitLeft)) : null
    const fill        = inPantry && stock !== 'out' ? (infinite ? 1 : stockFill(item.quantity, item.unitLeft)) : 0
    const typeName    = ing?.type?.name ?? ''
    const subTypeName = ing?.subType?.name ?? ''

    const barColor =
        stock === 'ok'  ? 'var(--success)' :
        stock === 'low' ? 'var(--brand-soft)' :
                          'var(--line-strong)'
    const shoppingQty = item.shoppingQuantity ?? 0

    const handleFavorite = async () => {
        if (busy) return
        setBusy(true)
        const next = !item.favorite
        onItemUpdated?.(item.id, { favorite: next })
        try {
            await update.mutateAsync({ id: item.id, data: { favorite: next } })
            onUpdated?.()
        } catch {
            onItemUpdated?.(item.id, { favorite: item.favorite })
            toast.error('Could not update favourite')
        } finally {
            setBusy(false)
        }
    }

    const handleDelete = async () => {
        if (busy) return
        setBusy(true)
        onDeleted?.(item.id)
        setMenuOpen(false)
        try {
            if (isShoppingView) {
                await update.mutateAsync({
                    id: item.id,
                    data: { shoppingQuantity: 0, isInShoppingList: false },
                })
                toast.success('Removed from shopping list')
            } else {
                await remove.mutateAsync(item.id)
                toast.success('Removed')
            }
        } catch {
            onUpdated?.()
        } finally {
            setBusy(false)
        }
    }

    const handleMoveToPantry = async (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (busy || shoppingQty <= 0) return

        setBusy(true)
        setMenuOpen(false)
        try {
            await moveToPantry.mutateAsync({
                ingredientId: item.ingredientId,
                amount: shoppingQty,
                unitLeft: item.unitLeft,
            })
            toast.success(`${ing?.name ?? 'Item'} moved to pantry`)
            onUpdated?.()
        } catch {
            toast.error('Could not move item to pantry')
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <div
                className="grid grid-cols-[1fr_auto_32px] sm:grid-cols-[2fr_1fr_1.5fr_minmax(100px,1fr)_40px] gap-3 sm:gap-4 items-center px-4 sm:px-6 py-4 bg-surface hover:bg-surface-hover-alt cursor-pointer transition-colors"
                onClick={() => setEditOpen(true)}
            >
                {/* INGREDIENT */}
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 bg-line bg-cover bg-center"
                        style={ing?.imageUrl ? { backgroundImage: `url(${ing.imageUrl})` } : {}}
                    />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-fg truncate">{ing?.name ?? '—'}</p>
                        {item.note && (
                            <p className="text-xs text-fg-muted truncate">{item.note}</p>
                        )}
                    </div>
                </div>

                {/* TYPE — desktop only */}
                <div className="hidden sm:block text-sm text-fg-secondary truncate">
                    {typeName}
                    {subTypeName && <span className="text-fg-muted"> · {subTypeName}</span>}
                </div>

                {/* STOCK BAR — desktop only */}
                <div className="hidden sm:flex items-center">
                    {isShoppingView || !inPantry || stock === 'out' ? (
                        <span className="text-xs text-fg-muted">—</span>
                    ) : (
                        <div className="h-1.5 bg-line rounded-full overflow-hidden w-full max-w-[160px]">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${fill * 100}%`, backgroundColor: barColor }}
                            />
                        </div>
                    )}
                </div>

                {/* QTY */}
                <div className="text-right">
                    {isShoppingView ? (
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-sm font-medium text-fg">
                                {shoppingQty > 0 ? `${shoppingQty} ${item.unitLeft}` : '—'}
                            </span>
                            {shoppingQty > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleMoveToPantry}
                                        disabled={busy}
                                        className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[11px] font-medium text-fg-on-brand transition-colors hover:bg-brand/90 disabled:opacity-50"
                                    >
                                        {busy ? <Loader2 size={12} className="animate-spin" /> : <PackageCheck size={12} />}
                                        Move to pantry
                                    </button>
                                </>
                            )}
                        </div>
                    ) : !inPantry ? (
                        <span className="text-xs font-medium text-brand-soft-strong">
                            {item.isInShoppingList ? `${shoppingQty} ${item.unitLeft}` : '—'}
                        </span>
                    ) : infinite ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft/15 px-2 py-0.5 text-xs font-medium text-brand">
                            <span aria-hidden className="text-base leading-none">∞</span>
                            Always stocked
                        </span>
                    ) : stock === 'out' ? (
                        <span className="text-xs font-medium text-brand-soft-strong">Out of stock</span>
                    ) : (
                        <span className={`text-sm font-medium ${stock === 'low' ? 'text-brand' : 'text-fg'}`}>
                            {item.quantity} {item.unitLeft}
                            {stock === 'low' && (
                                <span className="ml-1.5 text-xs text-brand-soft-strong">· Low stock</span>
                            )}
                        </span>
                    )}
                </div>

                {/* MENU */}
                <div
                    className="flex items-center justify-end"
                    onClick={e => e.stopPropagation()}
                >
                    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="p-1.5 rounded-lg hover:bg-canvas-hover-alt text-fg-muted transition-colors"
                                aria-label={`Actions for ${ing?.name ?? 'pantry item'}`}
                            >
                                <MoreHorizontal size={16} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            sideOffset={6}
                            collisionPadding={12}
                            className="z-50 min-w-[140px] rounded-xl border-line bg-surface py-1 text-fg-secondary shadow-lg"
                        >
                            <DropdownMenuItem
                                onSelect={() => setEditOpen(true)}
                                className="rounded-lg px-4 py-2 focus:bg-surface-hover-alt focus:text-fg-secondary"
                            >
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => void handleFavorite()}
                                className="rounded-lg px-4 py-2 focus:bg-surface-hover-alt focus:text-fg-secondary"
                            >
                                {item.favorite ? 'Unfavourite' : 'Favourite'}
                            </DropdownMenuItem>
                            {isShoppingView && shoppingQty > 0 && (
                                <DropdownMenuItem
                                    onSelect={() => void handleMoveToPantry()}
                                    disabled={busy}
                                    className="rounded-lg px-4 py-2 focus:bg-surface-hover-alt focus:text-fg-secondary"
                                >
                                    Move to pantry
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-line" />
                            <DropdownMenuItem
                                onSelect={() => setConfirmOpen(true)}
                                disabled={busy}
                                className="rounded-lg px-4 py-2 text-danger focus:bg-danger-bg focus:text-danger"
                            >
                                {busy && <Loader2 size={13} className="animate-spin" />}
                                Remove
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <EditPantryItemDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                item={item}
                contextMode={isShoppingView ? 'shopping' : 'default'}
                onUpdated={() => onUpdated?.()}
            />
            {confirmOpen && (
                <ConfirmDialog
                    title={`Remove ${ing?.name ?? 'item'}?`}
                    description={isShoppingView ? 'This will remove it from your shopping list.' : 'This will permanently remove it from your pantry.'}
                    confirmLabel="Remove"
                    onConfirm={() => { setConfirmOpen(false); void handleDelete() }}
                    onCancel={() => setConfirmOpen(false)}
                />
            )}
        </>
    )
}
