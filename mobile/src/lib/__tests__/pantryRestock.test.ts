import type { UserPantryItemDTO } from '@mixoguide/shared'
import {
    isRestockCandidate,
    lowStockThresholdForUnit,
    restockQuantityForUnit,
} from '../pantryRestock'

function makeItem(overrides: Partial<UserPantryItemDTO> = {}): UserPantryItemDTO {
    return {
        id: 'item-1',
        userId: 'user-1',
        ingredientId: 'ingredient-1',
        quantity: 0,
        unitLeft: 'ml',
        favorite: false,
        expirationDate: null,
        isEssential: false,
        isInfinite: false,
        isInPantry: true,
        isInShoppingList: false,
        shoppingQuantity: 0,
        addedAt: '2026-01-01T00:00:00.000Z',
        note: null,
        updatedAt: null,
        ingredient: null,
        ...overrides,
    }
}

describe('pantryRestock helpers', () => {
    it('normalizes unit casing and spaces when looking up restock quantity', () => {
        expect(restockQuantityForUnit(' ML ')).toBe(750)
        expect(restockQuantityForUnit('Pieces')).toBe(6)
    })

    it('normalizes unit casing and spaces when looking up low threshold', () => {
        expect(lowStockThresholdForUnit(' CL ')).toBe(10)
        expect(lowStockThresholdForUnit('KG')).toBe(0.05)
    })

    it('returns false for non-pantry or infinite items', () => {
        expect(isRestockCandidate(makeItem({ isInPantry: false, quantity: 0 }))).toBe(false)
        expect(isRestockCandidate(makeItem({ isInfinite: true, quantity: 0 }))).toBe(false)
    })

    it('marks items as restock candidates when quantity is at or below threshold', () => {
        expect(isRestockCandidate(makeItem({ unitLeft: 'ml', quantity: 100 }))).toBe(true)
        expect(isRestockCandidate(makeItem({ unitLeft: 'ml', quantity: 101 }))).toBe(false)
        expect(isRestockCandidate(makeItem({ unitLeft: 'KG', quantity: 0.05 }))).toBe(true)
    })
})
