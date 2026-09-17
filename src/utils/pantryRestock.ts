import type { UserPantryItem } from '@/types/models/pantry'

export const RESTOCK_QUANTITY_BY_UNIT: Record<string, number> = {
    cl: 75,
    ml: 750,
    oz: 25,
    g: 1000,
    pcs: 6,
    zest: 6,
    slice: 6,
    twist: 6,
}

export const LOW_STOCK_THRESHOLD_BY_UNIT: Record<string, number> = {
    cl: 10,
    ml: 100,
    oz: 3.4,
    g: 50,
    pcs: 2,
    zest: 2,
    slice: 2,
    twist: 2,
}

export function restockQuantityForUnit(unit?: string | null): number {
    return RESTOCK_QUANTITY_BY_UNIT[(unit ?? '').toLowerCase()] ?? 1
}

export function isRestockCandidate(item: Pick<UserPantryItem, 'isInPantry' | 'isInfinite' | 'quantity' | 'unitLeft'>): boolean {
    if (!item.isInPantry || item.isInfinite) return false

    const threshold = LOW_STOCK_THRESHOLD_BY_UNIT[item.unitLeft] ?? 5
    return item.quantity <= threshold
}
