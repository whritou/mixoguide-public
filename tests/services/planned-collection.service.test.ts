import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, ForbiddenError, ConflictError } from '@/utils/errors'
import { Prisma } from '@prisma/client'

vi.mock('@/lib/derivations/derivation-cache', () => ({
    convertUnit: vi.fn((amount: number, from: string, to: string) => from === to ? amount : null),
    getDerivationMap: vi.fn().mockResolvedValue(new Map()),
}))

const { mockCollectionRepo, mockPantryRepo, mockInvalidateMakeableCache, mockPrisma, mockTx } = vi.hoisted(() => {
    const mockTx = { __tx: true }
    return {
        mockTx,
        mockPrisma: {
            $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
        },
        mockCollectionRepo: {
            findWithCocktails: vi.fn(),
            completeAllCocktails: vi.fn(),
            completeCocktail: vi.fn(),
            claimCompletion: vi.fn(),
            hasPlannedCocktails: vi.fn(),
            addCocktail: vi.fn(),
            findShareInfoByToken: vi.fn(),
            countGuestRsvps: vi.fn(),
            createRsvp: vi.fn(),
            update: vi.fn(),
            hardDelete: vi.fn(),
        },
        mockPantryRepo: {
            findMany: vi.fn(),
            decrementForCocktail: vi.fn(),
            decrementForCocktails: vi.fn(),
        },
        mockInvalidateMakeableCache: vi.fn().mockResolvedValue(undefined),
    }
})

vi.mock('@/repositories/planned-collection.repository', () => ({
    plannedCollectionRepository: mockCollectionRepo,
}))
vi.mock('@/repositories/pantry.repository', () => ({
    pantryRepository: mockPantryRepo,
}))
vi.mock('@/lib/cache/makeable-cache', () => ({
    invalidateMakeableCache: mockInvalidateMakeableCache,
}))
vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma }))

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
        cocktailId: id,
        status: 'planned',
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
        mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx))
        mockCollectionRepo.claimCompletion.mockResolvedValue(true)
    })

    it('throws NotFoundError when collection not found', async () => {
        mockCollectionRepo.findWithCocktails.mockResolvedValue(null)
        await expect(plannedCollectionService.complete(COLL)).rejects.toThrow(NotFoundError)
    })

    it('claims the collection, batches the decrement for claimed cocktails only, then invalidates', async () => {
        mockCollectionRepo.findWithCocktails.mockResolvedValue(
            makeCollection({
                servings: 2,
                cocktails: [
                    cocktailEntry('c1', [{ ingredientId: 'gin', amount: 6, unit: 'cl' }]),
                    cocktailEntry('c2', [{ ingredientId: 'rum', amount: 5, unit: 'cl' }]),
                ],
            })
        )
        // c2 was already completed individually: only c1 is claimed now.
        mockCollectionRepo.completeAllCocktails.mockResolvedValue(['c1'])

        await plannedCollectionService.complete(COLL)

        expect(mockCollectionRepo.claimCompletion).toHaveBeenCalledWith(COLL, expect.any(Date), mockTx)
        expect(mockPantryRepo.decrementForCocktails).toHaveBeenCalledTimes(1)
        expect(mockPantryRepo.decrementForCocktails).toHaveBeenCalledWith(UID, [[
            expect.objectContaining({ ingredientId: 'gin', amount: 12, unit: 'cl' }),
        ]], mockTx)
        expect(mockInvalidateMakeableCache).toHaveBeenCalledWith(UID)
    })

    it('throws ConflictError when the collection is already completed', async () => {
        mockCollectionRepo.findWithCocktails.mockResolvedValue(makeCollection({ status: 'done' }))
        await expect(plannedCollectionService.complete(COLL)).rejects.toThrow(ConflictError)
        expect(mockPantryRepo.decrementForCocktails).not.toHaveBeenCalled()
    })

    it('throws ConflictError and deducts nothing when a concurrent call won the claim', async () => {
        mockCollectionRepo.findWithCocktails.mockResolvedValue(
            makeCollection({ cocktails: [cocktailEntry('c1', [{ ingredientId: 'gin', amount: 6, unit: 'cl' }])] })
        )
        mockCollectionRepo.claimCompletion.mockResolvedValue(false)

        await expect(plannedCollectionService.complete(COLL)).rejects.toThrow(ConflictError)
        expect(mockCollectionRepo.completeAllCocktails).not.toHaveBeenCalled()
        expect(mockPantryRepo.decrementForCocktails).not.toHaveBeenCalled()
        expect(mockInvalidateMakeableCache).not.toHaveBeenCalled()
    })
})

describe('PlannedCollectionService.completeCocktail', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx))
    })

    it('claims the cocktail, decrements in the same transaction and closes the collection when last', async () => {
        mockCollectionRepo.findWithCocktails.mockResolvedValue(
            makeCollection({ cocktails: [cocktailEntry('c1', [{ ingredientId: 'gin', amount: 6, unit: 'cl' }])] })
        )
        mockCollectionRepo.completeCocktail.mockResolvedValue({ count: 1 })
        mockCollectionRepo.hasPlannedCocktails.mockResolvedValue(false)

        await plannedCollectionService.completeCocktail(COLL, 'c1')

        expect(mockCollectionRepo.completeCocktail).toHaveBeenCalledWith(COLL, 'c1', expect.any(Date), mockTx)
        expect(mockPantryRepo.decrementForCocktail).toHaveBeenCalledWith(UID, [
            expect.objectContaining({ ingredientId: 'gin', amount: 6 }),
        ], mockTx)
        expect(mockCollectionRepo.claimCompletion).toHaveBeenCalledWith(COLL, expect.any(Date), mockTx)
        expect(mockInvalidateMakeableCache).toHaveBeenCalledWith(UID)
    })

    it('throws ConflictError on a double completion (lost claim) without deducting', async () => {
        mockCollectionRepo.findWithCocktails.mockResolvedValue(
            makeCollection({ cocktails: [cocktailEntry('c1', [{ ingredientId: 'gin', amount: 6, unit: 'cl' }])] })
        )
        mockCollectionRepo.completeCocktail.mockResolvedValue({ count: 0 })

        await expect(plannedCollectionService.completeCocktail(COLL, 'c1')).rejects.toThrow(ConflictError)
        expect(mockPantryRepo.decrementForCocktail).not.toHaveBeenCalled()
    })
})

describe('PlannedCollectionService.addCocktail', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('maps a unique violation (P2002) to ConflictError', async () => {
        mockCollectionRepo.addCocktail.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
        )
        await expect(plannedCollectionService.addCocktail(COLL, 'c1')).rejects.toThrow(ConflictError)
    })
})

describe('PlannedCollectionService.addRsvp', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockCollectionRepo.findShareInfoByToken.mockResolvedValue({ id: COLL, shareEnabled: true })
    })

    const rsvp = { name: 'Guest', status: 'going' as const, guestCount: 1 }

    it('rejects guest RSVPs beyond the per-collection cap', async () => {
        mockCollectionRepo.countGuestRsvps.mockResolvedValue(200)
        await expect(plannedCollectionService.addRsvp('tok', rsvp)).rejects.toThrow(ConflictError)
        expect(mockCollectionRepo.createRsvp).not.toHaveBeenCalled()
    })

    it('does not apply the guest cap to logged-in users (upsert path)', async () => {
        mockCollectionRepo.createRsvp.mockResolvedValue({ id: 'r1' })
        await plannedCollectionService.addRsvp('tok', { ...rsvp, userId: UID })
        expect(mockCollectionRepo.countGuestRsvps).not.toHaveBeenCalled()
        expect(mockCollectionRepo.createRsvp).toHaveBeenCalledWith(expect.objectContaining({ collectionId: COLL, userId: UID }))
    })

    it('returns NotFound for a revoked link', async () => {
        mockCollectionRepo.findShareInfoByToken.mockResolvedValue({ id: COLL, shareEnabled: false })
        await expect(plannedCollectionService.addRsvp('tok', rsvp)).rejects.toThrow(NotFoundError)
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
