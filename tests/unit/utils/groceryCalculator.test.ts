/**
 * Unit tests for groceryCalculator pure functions.
 *
 * Scenarios covered:
 *  buildPantryMap   — single row · multiple pantry rows (same/different units) ·
 *                     shopping-list-only row · pantry + shopping list · empty
 *  aggregateNeeded  — same ingredient twice · different units · optional skip · empty
 *  computeGroceryList — fully stocked · fully missing · partial · inWishlist ·
 *                       pantry + wishlist · sort order
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── mock convertUnit before importing the module under test ──────────────────
vi.mock('@/lib/derivations/derivation-cache', () => ({
    convertUnit: vi.fn((amount: number, from: string, to: string): number | null => {
        if (from === to) return amount
        const rates: Record<string, Record<string, number>> = {
            cl:  { ml: 10,    oz: 0.338 },
            ml:  { cl: 0.1,   oz: 0.0338 },
            oz:  { cl: 2.957, ml: 29.574 },
        }
        const r = rates[from]?.[to]
        return r !== undefined ? +(amount * r).toFixed(4) : null
    }),
    getDerivationMap: vi.fn().mockResolvedValue(new Map()),
}))

import { buildPantryMap, aggregateNeeded, computeGroceryList } from '@/utils/groceryCalculator'

// ── helpers ──────────────────────────────────────────────────────────────────
function pantryRow(ingredientId: string, quantity: number, unit = 'cl') {
    return { ingredientId, quantity, unitLeft: unit, isInPantry: true, isInShoppingList: false }
}
function shoppingRow(ingredientId: string, quantity: number, unit = 'cl') {
    return { ingredientId, quantity, unitLeft: unit, isInPantry: false, isInShoppingList: true }
}
function needed(ingredientId: string, amount: number, unit = 'cl', name?: string) {
    return { ingredientId, ingredientName: name ?? ingredientId, amount, unit }
}

// ════════════════════════════════════════════════════════════════════════════
describe('buildPantryMap', () => {

    describe('single row', () => {
        it('maps a pantry item correctly', () => {
            const map = buildPantryMap([pantryRow('gin', 70)])
            expect(map.get('gin')).toEqual({ quantity: 70, unit: 'cl', isInShoppingList: false })
        })

        it('shopping-list-only row has quantity 0 and isInShoppingList true', () => {
            const map = buildPantryMap([shoppingRow('tonic', 20)])
            expect(map.get('tonic')).toEqual({ quantity: 0, unit: 'cl', isInShoppingList: true })
        })

        it('ignores shopping-list quantity for pantry amount', () => {
            const map = buildPantryMap([shoppingRow('gin', 999)])
            expect(map.get('gin')?.quantity).toBe(0)
        })
    })

    describe('pantry row + shopping list row for same ingredient', () => {
        it('last row wins — shopping row overwrites pantry quantity to 0', () => {
            const map = buildPantryMap([
                pantryRow('gin',  50),
                shoppingRow('gin', 20),  // last row wins → quantity = 0, isInShoppingList = true
            ])
            expect(map.get('gin')).toEqual({ quantity: 0, unit: 'cl', isInShoppingList: true })
        })
    })

    describe('mixed ingredients', () => {
        it('handles a realistic pantry snapshot — last row wins for duplicates', () => {
            const map = buildPantryMap([
                pantryRow('gin',    70),
                pantryRow('gin',    30),        // duplicate pantry → last wins = 30
                shoppingRow('tonic', 20),        // shopping only
                pantryRow('lime',    5, 'pcs'),  // single pantry, pcs unit
                shoppingRow('lime',  3, 'pcs'),  // last row wins → quantity = 0, isInShoppingList = true
                pantryRow('syrup',  25),
            ])
            expect(map.get('gin')?.quantity).toBe(30)  // last row wins
            expect(map.get('gin')?.isInShoppingList).toBe(false)
            expect(map.get('tonic')?.quantity).toBe(0)
            expect(map.get('tonic')?.isInShoppingList).toBe(true)
            expect(map.get('lime')?.quantity).toBe(0)  // last row is shopping, so 0
            expect(map.get('lime')?.isInShoppingList).toBe(true)
            expect(map.get('syrup')?.quantity).toBe(25)
        })
    })

    it('returns empty map for empty input', () => {
        expect(buildPantryMap([])).toEqual(new Map())
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('aggregateNeeded', () => {
    it('creates a single entry for a single ingredient', () => {
        const map = aggregateNeeded([needed('gin', 6)])
        expect(map.get('gin')).toEqual({ name: 'gin', amount: 6, unit: 'cl' })
    })

    it('sums amounts for the same ingredient with the same unit', () => {
        const map = aggregateNeeded([
            needed('gin', 6),
            needed('gin', 4),
        ])
        expect(map.get('gin')?.amount).toBe(10)
    })

    it('converts and sums same ingredient with different units', () => {
        const map = aggregateNeeded([
            needed('gin', 6,   'cl'),
            needed('gin', 30,  'ml'), // 30ml = 3cl
        ])
        expect(map.get('gin')?.amount).toBeCloseTo(9, 1)
        expect(map.get('gin')?.unit).toBe('cl') // first unit wins
    })

    it('skips optional ingredients entirely', () => {
        const map = aggregateNeeded([
            { ingredientId: 'gin',   ingredientName: 'Gin',   amount: 6, unit: 'cl', optional: false },
            { ingredientId: 'lemon', ingredientName: 'Lemon', amount: 1, unit: 'pcs', optional: true  },
        ])
        expect(map.has('gin')).toBe(true)
        expect(map.has('lemon')).toBe(false)
    })

    it('handles ingredients that appear in multiple cocktails', () => {
        const map = aggregateNeeded([
            needed('gin', 6),
            needed('tonic', 15),
            needed('gin', 4),   // gin appears again
            needed('tonic', 10),
        ])
        expect(map.get('gin')?.amount).toBe(10)
        expect(map.get('tonic')?.amount).toBe(25)
    })

    it('returns empty map for empty input', () => {
        expect(aggregateNeeded([])).toEqual(new Map())
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('computeGroceryList', () => {
    const asNeeded = (id: string, amount: number, unit = 'cl', name?: string) =>
        [id, { name: name ?? id, amount, unit }] as const

    it('fully stocked ingredient: missing = 0, inPantry = available qty', () => {
        const need  = new Map([asNeeded('gin', 6)])
        const pantry = new Map([['gin', { quantity: 70, unit: 'cl', isInShoppingList: false }]])
        const [item] = computeGroceryList(need, pantry)
        expect(item.missing).toBe(0)
        expect(item.inPantry).toBe(70)
        expect(item.inWishlist).toBe(false)
    })

    it('fully missing ingredient: missing = totalNeeded, inPantry = 0', () => {
        const need   = new Map([asNeeded('gin', 6)])
        const pantry = new Map<string, any>()
        const [item] = computeGroceryList(need, pantry)
        expect(item.missing).toBe(6)
        expect(item.inPantry).toBe(0)
        expect(item.inWishlist).toBe(false)
    })

    it('partially in pantry: missing = needed - available', () => {
        const need   = new Map([asNeeded('gin', 10)])
        const pantry = new Map([['gin', { quantity: 6, unit: 'cl', isInShoppingList: false }]])
        const [item] = computeGroceryList(need, pantry)
        expect(item.missing).toBe(4)
        expect(item.inPantry).toBe(6)
    })

    it('shopping list only (no pantry): missing = total, inWishlist = true', () => {
        const need   = new Map([asNeeded('gin', 6)])
        const pantry = new Map([['gin', { quantity: 0, unit: 'cl', isInShoppingList: true }]])
        const [item] = computeGroceryList(need, pantry)
        expect(item.missing).toBe(6)
        expect(item.inWishlist).toBe(true)
        expect(item.inPantry).toBe(0)
    })

    it('in pantry (partial) AND in shopping list: inWishlist = true, missing reflects pantry gap', () => {
        const need   = new Map([asNeeded('gin', 10)])
        const pantry = new Map([['gin', { quantity: 4, unit: 'cl', isInShoppingList: true }]])
        const [item] = computeGroceryList(need, pantry)
        expect(item.inPantry).toBe(4)
        expect(item.missing).toBe(6)
        expect(item.inWishlist).toBe(true)
    })

    it('multiple pantry rows (pre-aggregated via buildPantryMap) show summed quantity', () => {
        // Simulate: buildPantryMap already summed two rows of 40cl + 30cl = 70cl
        const need   = new Map([asNeeded('gin', 6)])
        const pantry = new Map([['gin', { quantity: 70, unit: 'cl', isInShoppingList: false }]])
        const [item] = computeGroceryList(need, pantry)
        expect(item.missing).toBe(0)
        expect(item.inPantry).toBe(70)
    })

    it('sorting: missing items appear before stocked items', () => {
        const need = new Map([
            asNeeded('gin',   6),
            asNeeded('tonic', 20),
        ])
        const pantry = new Map([
            ['gin',   { quantity: 70, unit: 'cl', isInShoppingList: false }], // stocked
            ['tonic', { quantity: 0,  unit: 'cl', isInShoppingList: false }], // missing
        ])
        const list = computeGroceryList(need, pantry)
        expect(list[0].ingredientId).toBe('tonic') // missing first
        expect(list[1].ingredientId).toBe('gin')   // stocked second
    })

    it('sorting: among missing items, sorted alphabetically by name', () => {
        const need = new Map([
            asNeeded('z-ing', 5, 'cl', 'Zucchini'),
            asNeeded('a-ing', 5, 'cl', 'Apricot'),
        ])
        const list = computeGroceryList(need, new Map())
        expect(list[0].ingredientName).toBe('Apricot')
        expect(list[1].ingredientName).toBe('Zucchini')
    })

    it('clamps inPantry to totalNeeded in output (missing never goes below 0)', () => {
        const need   = new Map([asNeeded('gin', 6)])
        const pantry = new Map([['gin', { quantity: 999, unit: 'cl', isInShoppingList: false }]])
        const [item] = computeGroceryList(need, pantry)
        expect(item.missing).toBe(0)
        expect(item.inPantry).toBe(999) // full pantry shown; just no missing
    })

    it('returns empty list for empty needed map', () => {
        expect(computeGroceryList(new Map(), new Map())).toEqual([])
    })
})
