/**
 * Planned-cocktail service tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, ForbiddenError, ConflictError } from '@/utils/errors'

const {
    mockPlannedCocktailRepo,
    mockCocktailRepo,
    mockPantryRepo,
    mockMadeLogRepo,
    mockInvalidateMakeableCache,
    mockTx,
    mockPrisma,
    mockIdempotency,
} = vi.hoisted(() => {
    const mockTx = { __tx: true }
    return {
    mockTx,
    mockPrisma: {
        $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
    },
    mockIdempotency: {
        claimIdempotencyKey:   vi.fn().mockResolvedValue(true),
        releaseIdempotencyKey: vi.fn().mockResolvedValue(undefined),
    },
    mockPlannedCocktailRepo: {
        findMany:                    vi.fn(),
        findById:                    vi.fn(),
        create:                      vi.fn(),
        update:                      vi.fn(),
        hardDelete:                  vi.fn(),
        findByUserAndCocktail:       vi.fn(),
        findWithCocktailIngredients: vi.fn(),
        upsertAsMade:                vi.fn(),
        upsertPlanned:               vi.fn(),
        claimCompletion:             vi.fn(),
    },
    mockCocktailRepo: {
        findWithIngredients: vi.fn(),
    },
    mockPantryRepo: {
        decrementForCocktail: vi.fn(),
    },
    mockMadeLogRepo: {
        create: vi.fn(),
    },
    mockInvalidateMakeableCache: vi.fn().mockResolvedValue(undefined),
    }
})

vi.mock('@/repositories/planned-cocktail.repository', () => ({
    plannedCocktailRepository: mockPlannedCocktailRepo,
}))
vi.mock('@/repositories/cocktail.repository', () => ({
    cocktailRepository: mockCocktailRepo,
}))
vi.mock('@/repositories/pantry.repository', () => ({
    pantryRepository: mockPantryRepo,
}))
vi.mock('@/repositories/cocktail-made-log.repository', () => ({
    cocktailMadeLogRepository: mockMadeLogRepo,
}))
vi.mock('@/lib/cache/makeable-cache', () => ({
    invalidateMakeableCache: mockInvalidateMakeableCache,
}))
vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/cache/idempotency', () => mockIdempotency)

import { plannedCocktailService } from '@/services/planned-cocktail.service'

const UID = 'user-1'
const CID = 'cocktail-1'

function cocktailWith(ingredients: Array<{ ingredientId: string; amount: number | null; unit: string }>) {
    return { id: CID, name: 'Negroni', ingredients }
}

function plannedRecord(overrides: Record<string, any> = {}) {
    return {
        id: 'pc-1', userId: UID, cocktailId: CID, quantity: 1,
        status: 'planned', plannedFor: new Date(), cocktail: null,
        ...overrides,
    }
}

// ════════════════════════════════════════════════════════════════════════════
describe('PlannedCocktailService.makeNow', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockPlannedCocktailRepo.upsertAsMade.mockResolvedValue({ id: 'pc-new' })
        mockIdempotency.claimIdempotencyKey.mockResolvedValue(true)
        mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockTx))
    })

    it('throws NotFoundError when cocktail does not exist', async () => {
        mockCocktailRepo.findWithIngredients.mockResolvedValue(null)
        await expect(plannedCocktailService.makeNow(UID, CID, 1)).rejects.toThrow(NotFoundError)
        expect(mockPlannedCocktailRepo.upsertAsMade).not.toHaveBeenCalled()
    })

    it('creates a planned record with status done', async () => {
        mockCocktailRepo.findWithIngredients.mockResolvedValue({ id: CID, ingredients: [] })

        await plannedCocktailService.makeNow(UID, CID, 2)

        expect(mockPlannedCocktailRepo.upsertAsMade).toHaveBeenCalledWith(UID, CID, 2, expect.any(Date), mockTx)
    })

    it('does NOT call decrementForCocktail when cocktail has no ingredients', async () => {
        mockCocktailRepo.findWithIngredients.mockResolvedValue({ id: CID, ingredients: [] })

        await plannedCocktailService.makeNow(UID, CID, 1)

        expect(mockPantryRepo.decrementForCocktail).not.toHaveBeenCalled()
    })

    it('decrements pantry with amounts × quantity', async () => {
        mockCocktailRepo.findWithIngredients.mockResolvedValue(
            cocktailWith([
                { ingredientId: 'gin',   amount: 6,  unit: 'cl' },
                { ingredientId: 'tonic', amount: 15, unit: 'cl' },
            ])
        )

        await plannedCocktailService.makeNow(UID, CID, 2)

        expect(mockPantryRepo.decrementForCocktail).toHaveBeenCalledWith(UID, [
            expect.objectContaining({ ingredientId: 'gin',   amount: 12, unit: 'cl' }),
            expect.objectContaining({ ingredientId: 'tonic', amount: 30, unit: 'cl' }),
        ], mockTx)
    })

    it('quantity = 1 passes amounts unchanged', async () => {
        mockCocktailRepo.findWithIngredients.mockResolvedValue(
            cocktailWith([{ ingredientId: 'gin', amount: 6, unit: 'cl' }])
        )

        await plannedCocktailService.makeNow(UID, CID, 1)

        expect(mockPantryRepo.decrementForCocktail).toHaveBeenCalledWith(UID, [
            expect.objectContaining({ ingredientId: 'gin', amount: 6, unit: 'cl' }),
        ], mockTx)
    })

    it('does not decrement ingredients without a quantity', async () => {
        mockCocktailRepo.findWithIngredients.mockResolvedValue(
            cocktailWith([{ ingredientId: 'garnish', amount: null, unit: 'pcs' }])
        )

        await plannedCocktailService.makeNow(UID, CID, 1)

        expect(mockPantryRepo.decrementForCocktail).not.toHaveBeenCalled()
    })

    it('rejects a replayed idempotency key with ConflictError and writes nothing', async () => {
        mockCocktailRepo.findWithIngredients.mockResolvedValue(
            cocktailWith([{ ingredientId: 'gin', amount: 6, unit: 'cl' }])
        )
        mockIdempotency.claimIdempotencyKey.mockResolvedValueOnce(false)

        await expect(plannedCocktailService.makeNow(UID, CID, 1, { idempotencyKey: 'key-12345678' }))
            .rejects.toThrow(ConflictError)
        expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('releases the idempotency key when the transaction fails', async () => {
        mockCocktailRepo.findWithIngredients.mockResolvedValue(
            cocktailWith([{ ingredientId: 'gin', amount: 6, unit: 'cl' }])
        )
        mockPantryRepo.decrementForCocktail.mockRejectedValueOnce(new Error('db down'))

        await expect(plannedCocktailService.makeNow(UID, CID, 1, { idempotencyKey: 'key-12345678' }))
            .rejects.toThrow('db down')
        expect(mockIdempotency.releaseIdempotencyKey).toHaveBeenCalledWith('make', UID, 'key-12345678')
        expect(mockInvalidateMakeableCache).not.toHaveBeenCalled()
    })

    it('ingredient in pantry AND shopping list: service passes it to decrementForCocktail normally', async () => {
        // The repository handles picking the pantry row; service just passes the ingredient list
        mockCocktailRepo.findWithIngredients.mockResolvedValue(
            cocktailWith([{ ingredientId: 'gin', amount: 6, unit: 'cl' }])
        )

        await plannedCocktailService.makeNow(UID, CID, 1)

        expect(mockPantryRepo.decrementForCocktail).toHaveBeenCalledWith(
            UID,
            expect.arrayContaining([expect.objectContaining({ ingredientId: 'gin' })]),
            mockTx,
        )
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('PlannedCocktailService.complete', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockPlannedCocktailRepo.claimCompletion.mockResolvedValue(true)
    })

    it('throws NotFoundError when planned cocktail not found', async () => {
        mockPlannedCocktailRepo.findWithCocktailIngredients.mockResolvedValue(null)
        await expect(plannedCocktailService.complete('nonexistent')).rejects.toThrow(NotFoundError)
    })

    it('claims the planned → done transition inside the transaction', async () => {
        mockPlannedCocktailRepo.findWithCocktailIngredients.mockResolvedValue(
            plannedRecord({ cocktail: { ingredients: [] } })
        )

        const result = await plannedCocktailService.complete('pc-1')

        expect(mockPlannedCocktailRepo.claimCompletion).toHaveBeenCalledWith('pc-1', expect.any(Date), mockTx)
        expect(mockMadeLogRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ userId: UID, cocktailId: CID, quantity: 1 }),
            mockTx,
        )
        expect(result).toEqual(expect.objectContaining({ status: 'done', completedAt: expect.any(Date) }))
        expect(mockInvalidateMakeableCache).toHaveBeenCalledWith(UID)
    })

    it('throws ConflictError (409) when the cocktail is already completed', async () => {
        mockPlannedCocktailRepo.findWithCocktailIngredients.mockResolvedValue(
            plannedRecord({ status: 'done', cocktail: { ingredients: [{ ingredientId: 'gin', amount: 6, unit: 'cl' }] } })
        )

        await expect(plannedCocktailService.complete('pc-1')).rejects.toThrow(ConflictError)
        expect(mockPrisma.$transaction).not.toHaveBeenCalled()
        expect(mockMadeLogRepo.create).not.toHaveBeenCalled()
        expect(mockPantryRepo.decrementForCocktail).not.toHaveBeenCalled()
    })

    it('throws ConflictError and writes nothing when a concurrent request won the claim', async () => {
        mockPlannedCocktailRepo.findWithCocktailIngredients.mockResolvedValue(
            plannedRecord({ cocktail: { ingredients: [{ ingredientId: 'gin', amount: 6, unit: 'cl' }] } })
        )
        mockPlannedCocktailRepo.claimCompletion.mockResolvedValue(false)

        await expect(plannedCocktailService.complete('pc-1')).rejects.toThrow(ConflictError)
        expect(mockMadeLogRepo.create).not.toHaveBeenCalled()
        expect(mockPantryRepo.decrementForCocktail).not.toHaveBeenCalled()
        expect(mockInvalidateMakeableCache).not.toHaveBeenCalled()
    })

    it('does not call decrementForCocktail when cocktail has no ingredients', async () => {
        mockPlannedCocktailRepo.findWithCocktailIngredients.mockResolvedValue(
            plannedRecord({ cocktail: { ingredients: [] } })
        )

        await plannedCocktailService.complete('pc-1')

        expect(mockPantryRepo.decrementForCocktail).not.toHaveBeenCalled()
    })

    it('decrements pantry scaled by planned quantity', async () => {
        mockPlannedCocktailRepo.findWithCocktailIngredients.mockResolvedValue(
            plannedRecord({ quantity: 3, cocktail: { ingredients: [{ ingredientId: 'gin', amount: 6, unit: 'cl' }] } })
        )

        await plannedCocktailService.complete('pc-1')

        expect(mockPantryRepo.decrementForCocktail).toHaveBeenCalledWith(UID, [
            expect.objectContaining({ ingredientId: 'gin', amount: 18, unit: 'cl' }),
        ], mockTx)
    })

    it('decrements all ingredients in a multi-ingredient cocktail', async () => {
        mockPlannedCocktailRepo.findWithCocktailIngredients.mockResolvedValue(
            plannedRecord({
                quantity: 2,
                cocktail: {
                    ingredients: [
                        { ingredientId: 'gin',        amount: 5,  unit: 'cl' },
                        { ingredientId: 'lime-juice', amount: 2,  unit: 'cl' },
                        { ingredientId: 'lemon',      amount: 1,  unit: 'pcs' },
                    ],
                },
            })
        )

        await plannedCocktailService.complete('pc-1')

        expect(mockPantryRepo.decrementForCocktail).toHaveBeenCalledWith(UID, [
            expect.objectContaining({ ingredientId: 'gin',        amount: 10, unit: 'cl' }),
            expect.objectContaining({ ingredientId: 'lime-juice', amount: 4,  unit: 'cl' }),
            expect.objectContaining({ ingredientId: 'lemon',      amount: 2,  unit: 'pcs' }),
        ], mockTx)
    })

    it('does not decrement ingredients without a quantity', async () => {
        mockPlannedCocktailRepo.findWithCocktailIngredients.mockResolvedValue(
            plannedRecord({ cocktail: { ingredients: [{ ingredientId: 'garnish', amount: null, unit: 'pcs' }] } })
        )

        await plannedCocktailService.complete('pc-1')

        expect(mockPantryRepo.decrementForCocktail).not.toHaveBeenCalled()
    })

    it('all pantry states: shopping-list-only ingredient still decremented (repo handles it)', async () => {
        // Service just passes the ingredient list; the repo finds/skips based on isInPantry
        mockPlannedCocktailRepo.findWithCocktailIngredients.mockResolvedValue(
            plannedRecord({ cocktail: { ingredients: [{ ingredientId: 'tonic', amount: 15, unit: 'cl' }] } })
        )

        await plannedCocktailService.complete('pc-1')

        expect(mockPantryRepo.decrementForCocktail).toHaveBeenCalledWith(UID, [
            expect.objectContaining({ ingredientId: 'tonic', amount: 15, unit: 'cl' }),
        ], mockTx)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('PlannedCocktailService.assertOwnership', () => {
    it('throws ForbiddenError for non-owner non-admin', () => {
        expect(() => plannedCocktailService.assertOwnership({ userId: 'other' }, UID, false)).toThrow(ForbiddenError)
    })
    it('passes for owner', () => {
        expect(() => plannedCocktailService.assertOwnership({ userId: UID }, UID, false)).not.toThrow()
    })
    it('passes for admin', () => {
        expect(() => plannedCocktailService.assertOwnership({ userId: 'other' }, UID, true)).not.toThrow()
    })
})
