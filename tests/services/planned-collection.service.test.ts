import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, ForbiddenError } from '@/utils/errors'

vi.mock('@/lib/derivations/derivation-cache', () => ({
    convertUnit: vi.fn((amount: number, from: string, to: string) => from === to ? amount : null),
    getDerivationMap: vi.fn().mockResolvedValue(new Map()),
}))

const { mockCollectionRepo, mockPantryRepo, mockInvalidateMakeableCache } = vi.hoisted(() => ({
    mockCollectionRepo: {
        findWithCocktails: vi.fn(),
        completeAllCocktails: vi.fn(),
        update: vi.fn(),
        hardDelete: vi.fn(),
    },
    mockPantryRepo: {
        findMany: vi.fn(),
        decrementForCocktail: vi.fn(),
    },
    mockInvalidateMakeableCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/repositories/planned-collection.repository', () => ({
    plannedCollectionRepository: mockCollectionRepo,
}))
vi.mock('@/repositories/pantry.repository', () => ({
    pantryRepository: mockPantryRepo,
}))
vi.mock('@/lib/cache/makeable-cache', () => ({
    invalidateMakeableCache: mockInvalidateMakeableCache,
}))

import { plannedCollectionService } from '@/services/planned-collection.service'

const UID = 'user-1'
const COLL = 'col-1'

function makeCollection(overrides: Record<string, any> = {}) {
    return {
        id: COLL,
        userId: UID,
        title: 'Party',
        status: 'planned',
        occasions: [],
        servings: overrides.servings ?? 1,
        cocktails: overrides.cocktails ?? [],
        ...overrides,
    }
}

function cocktailEntry(id: string, ings: Array<{ ingredientId: string; amount: number; unit: string; optional?: boolean }>) {
    return {
        id: `entry-${id}`,
        cocktail: {
            id,
            name: `Cocktail-${id}`,
            ingredients: ings.map((i) => ({
                ...i,
                optional: i.optional ?? false,
                ingredient: { id: i.ingredientId, name: `Ing-${i.ingredientId}` },
            })),
        },
    }
}

function pantryRow(ingredientId: string, qty: number, unit = 'cl', inPantry = true, inShopping = false) {
    return {
        id: `pi-${ingredientId}`,
        userId: UID,
        ingredientId,
        quantity: qty,
        unitLeft: unit,
        isInPantry: inPantry,
        isInShoppingList: inShopping,
    }
}

function paginated(data: any[]) {
    return { data, total: data.length, page: 1, limit: 500 }
}

describe('PlannedCollectionService.getGroceryList', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('throws NotFoundError when collection not found', async () => {
        mockCollectionRepo.findWithCocktails.mockResolvedValue(null)
        mockPantryRepo.findMany.mockResolvedValue(paginated([]))

        await expect(plannedCollectionService.getGroceryList(COLL, UID)).rejects.toThrow(NotFoundError)
    })

    it('computes missing quantity from pantry stock', async () => {
        mockCollectionRepo.findWithCocktails.mockResolvedValue(
            makeCollection({ cocktails: [cocktailEntry('c1', [{ ingredientId: 'gin', amount: 10, unit: 'cl' }])] })
        )
        mockPantryRepo.findMany.mockResolvedValue(paginated([pantryRow('gin', 4)]))

        const list = await plannedCollectionService.getGroceryList(COLL, UID)
        expect(list[0].inPantry).toBe(4)
        expect(list[0].missing).toBe(6)
    })
})

describe('PlannedCollectionService.complete', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('throws NotFoundError when collection not found', async () => {
        mockCollectionRepo.findWithCocktails.mockResolvedValue(null)
        await expect(plannedCollectionService.complete(COLL)).rejects.toThrow(NotFoundError)
    })

    it('marks done, decrements pantry, and invalidates makeable cache', async () => {
        mockCollectionRepo.findWithCocktails.mockResolvedValue(
            makeCollection({
                servings: 2,
                cocktails: [cocktailEntry('c1', [{ ingredientId: 'gin', amount: 6, unit: 'cl' }])],
            })
        )
        mockCollectionRepo.update.mockResolvedValue({})

        await plannedCollectionService.complete(COLL)

        expect(mockCollectionRepo.update).toHaveBeenCalledWith(COLL, expect.objectContaining({
            status: 'done',
            completedAt: expect.any(Date),
        }))
        expect(mockPantryRepo.decrementForCocktail).toHaveBeenCalledWith(UID, [
            expect.objectContaining({ ingredientId: 'gin', amount: 12, unit: 'cl' }),
        ])
        expect(mockInvalidateMakeableCache).toHaveBeenCalledWith(UID)
    })
})

describe('PlannedCollectionService.assertOwnership', () => {
    it('throws ForbiddenError for non-owner', () => {
        expect(() => plannedCollectionService.assertOwnership({ userId: 'other' }, UID, false)).toThrow(ForbiddenError)
    })

    it('passes for owner', () => {
        expect(() => plannedCollectionService.assertOwnership({ userId: UID }, UID, false)).not.toThrow()
    })

    it('passes for admin', () => {
        expect(() => plannedCollectionService.assertOwnership({ userId: 'other' }, UID, true)).not.toThrow()
    })
})

describe('PlannedCollectionService.delete', () => {
    it('throws NotFoundError when collection is missing', async () => {
        mockCollectionRepo.hardDelete.mockResolvedValue(false)
        await expect(plannedCollectionService.delete(COLL)).rejects.toThrow(NotFoundError)
    })

    it('resolves when delete succeeds', async () => {
        mockCollectionRepo.hardDelete.mockResolvedValue(true)
        await expect(plannedCollectionService.delete(COLL)).resolves.not.toThrow()
    })
})
