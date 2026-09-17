import type { UserPantryItemDTO } from '@mixoguide/shared'

const DEFAULT_LOW_STOCK_THRESHOLD = 5

export const RESTOCK_QUANTITY_BY_UNIT: Record<string, number> = {
    cl: 75,
    ml: 750,
    l: 1,
    oz: 25,
    g: 1000,
    kg: 1,
    pcs: 6,
    pieces: 6,
    piece: 6,
    zest: 6,
    slice: 6,
    twist: 6,
}

export const LOW_STOCK_THRESHOLD_BY_UNIT: Record<string, number> = {
    cl: 10,
    ml: 100,
    l: 0.1,
    oz: 3.4,
    g: 50,
    kg: 0.05,
    pcs: 2,
    pieces: 2,
    piece: 2,
    zest: 2,
    slice: 2,
    twist: 2,
}

function normalizeUnit(unit?: string | null): string {
    return (unit ?? '').trim().toLowerCase()
}

export function restockQuantityForUnit(unit?: string | null): number {
    return RESTOCK_QUANTITY_BY_UNIT[normalizeUnit(unit)] ?? 1
}

export function lowStockThresholdForUnit(unit?: string | null): number {
    return LOW_STOCK_THRESHOLD_BY_UNIT[normalizeUnit(unit)] ?? DEFAULT_LOW_STOCK_THRESHOLD
}

export function isRestockCandidate(item: UserPantryItemDTO): boolean {
    if (!item.isInPantry || item.isInfinite) return false

    const threshold = lowStockThresholdForUnit(item.unitLeft)
    return item.quantity <= threshold
}
