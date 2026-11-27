/**
 * Unit tests for PantryRepository — mocks Prisma directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks (available before vi.mock factories run) ───────────────────
const { mockPI, mockIngredient, mockPrisma, mockGetDerivationMap, mockConvertUnit } = vi.hoisted(() => {
    const mockPI: any = {
        findMany:  vi.fn(),
        count:     vi.fn(),
        findFirst: vi.fn(),
        create:    vi.fn(),
        update:    vi.fn(),
        createMany: vi.fn(),
    }
    const mockIngredient: any = { findMany: vi.fn() }
    const mockPrisma: any = {
        userPantryItem: mockPI,
        ingredient: mockIngredient,
        $transaction: vi.fn(),
    }
    const mockGetDerivationMap = vi.fn()
    const mockConvertUnit = vi.fn((amount: number, from: string, to: string): number | null => {
        if (from === to) return amount
        const rates: Record<string, Record<string, number>> = {
            cl: { ml: 10 }, ml: { cl: 0.1 }, oz: { cl: 2.957 },
        }
        const r = rates[from]?.[to]
        return r !== undefined ? amount * r : null
    })
    return { mockPI, mockIngredient, mockPrisma, mockGetDerivationMap, mockConvertUnit }
})

vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/derivations/derivation-cache', () => ({
    getDerivationMap: mockGetDerivationMap,
    convertUnit:      mockConvertUnit,
}))

import { pantryRepository } from '@/repositories/pantry.repository'

// ── helpers ──────────────────────────────────────────────────────────────────
function row(id: string, ingredientId: string, quantity: number, unitLeft = 'cl', isInfinite = false) {
    return { id, ingredientId, quantity, unitLeft, isInfinite }
}

function setupTx() {
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: any) => any) => cb(mockPrisma))
}

// ════════════════════════════════════════════════════════════════════════════
describe('PantryRepository.createItem', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls prisma.create (not upsert)', async () => {
        mockPI.create.mockResolvedValue({ id: 'pi-1' })

        await pantryRepository.createItem('user-1', 'gin', {
            quantity: 50, unitLeft: 'cl', isInPantry: true, isInShoppingList: false,
        })

        expect(mockPI.create).toHaveBeenCalledTimes(1)
        expect(mockPI.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ userId: 'user-1', ingredientId: 'gin', quantity: 50 }),
        }))
    })

    it('can create two rows for the same ingredient', async () => {
        mockPI.create.mockResolvedValue({ id: 'pi-new' })

        await pantryRepository.createItem('user-1', 'gin', { quantity: 50, unitLeft: 'cl', isInPantry: true })
        await pantryRepository.createItem('user-1', 'gin', { quantity: 30, unitLeft: 'cl', isInPantry: true })

        expect(mockPI.create).toHaveBeenCalledTimes(2)
    })

    it('creates a shopping list item with correct flags', async () => {
        mockPI.create.mockResolvedValue({ id: 'pi-sl' })

        await pantryRepository.createItem('user-1', 'tonic', {
            quantity: 20, unitLeft: 'cl', isInPantry: false, isInShoppingList: true,
        })

        expect(mockPI.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ isInPantry: false, isInShoppingList: true }),
        }))
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('PantryRepository.decrementForCocktail', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        setupTx()
        mockGetDerivationMap.mockResolvedValue(new Map())
    })

    it('decrements a single pantry item', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-1', 'gin', 70)])
        mockPI.update.mockResolvedValue({})

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'gin', amount: 6, unit: 'cl' }])

        expect(mockPI.update).toHaveBeenCalledWith({ where: { id: 'pi-1' }, data: { quantity: 64 } })
    })

    it('decrements multiple ingredients', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-gin', 'gin', 70), row('pi-tonic', 'tonic', 100)])
        mockPI.update.mockResolvedValue({})

        await pantryRepository.decrementForCocktail('user-1', [
            { ingredientId: 'gin', amount: 6, unit: 'cl' },
            { ingredientId: 'tonic', amount: 15, unit: 'cl' },
        ])

        expect(mockPI.update).toHaveBeenCalledTimes(2)
        expect(mockPI.update).toHaveBeenCalledWith({ where: { id: 'pi-gin' },   data: { quantity: 64 } })
        expect(mockPI.update).toHaveBeenCalledWith({ where: { id: 'pi-tonic' }, data: { quantity: 85 } })
    })

    it('picks the row with the highest quantity when duplicates exist', async () => {
        mockPI.findMany.mockResolvedValue([
            row('pi-low',  'gin', 30),
            row('pi-high', 'gin', 70), // highest → must be picked
        ])
        mockPI.update.mockResolvedValue({})

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'gin', amount: 10, unit: 'cl' }])

        expect(mockPI.update).toHaveBeenCalledWith({ where: { id: 'pi-high' }, data: { quantity: 60 } })
        expect(mockPI.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'pi-low' } }))
    })

    it('clamps quantity to 0 when usage exceeds stock', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-1', 'gin', 4)])
        mockPI.update.mockResolvedValue({})

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'gin', amount: 10, unit: 'cl' }])

        expect(mockPI.update).toHaveBeenCalledWith({ where: { id: 'pi-1' }, data: { quantity: 0 } })
    })

    it('sets quantity to exactly 0 when usage equals stock', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-1', 'gin', 6)])
        mockPI.update.mockResolvedValue({})

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'gin', amount: 6, unit: 'cl' }])

        expect(mockPI.update).toHaveBeenCalledWith({ where: { id: 'pi-1' }, data: { quantity: 0 } })
    })

    it('rounds pcs items to nearest 0.5 (floor)', async () => {
        // 5 - 1.3 = 3.7 → floor(3.7 / 0.5) * 0.5 = 3.5
        mockPI.findMany.mockResolvedValue([row('pi-1', 'lemon', 5, 'pcs')])
        mockPI.update.mockResolvedValue({})

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'lemon', amount: 1.3, unit: 'pcs' }])

        expect(mockPI.update).toHaveBeenCalledWith({ where: { id: 'pi-1' }, data: { quantity: 3.5 } })
    })

    it('rounds non-pcs values to 2 decimal places', async () => {
        // 70 - 6.666 = 63.334 → 63.33
        mockPI.findMany.mockResolvedValue([row('pi-1', 'gin', 70)])
        mockPI.update.mockResolvedValue({})

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'gin', amount: 6.666, unit: 'cl' }])

        expect(mockPI.update).toHaveBeenCalledWith({ where: { id: 'pi-1' }, data: { quantity: 63.33 } })
    })

    it('skips ingredient with null amount', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-1', 'gin', 70)])

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'gin', amount: null, unit: 'cl' }])

        expect(mockPI.update).not.toHaveBeenCalled()
    })

    it('skips garnish usage when ingredient metadata is available', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-1', 'orange-peel', 4, 'twist')])

        await pantryRepository.decrementForCocktail('user-1', [{
            ingredientId: 'orange-peel',
            amount: 1,
            unit: 'twist',
            ingredient: {
                name: 'Orange Peel',
                type: { name: 'Garnish' },
                subType: { name: 'Citrus Twist / Peel' },
            },
        }])

        expect(mockPI.update).not.toHaveBeenCalled()
    })

    it('skips ingredient with null unit', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-1', 'gin', 70)])

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'gin', amount: 6, unit: null }])

        expect(mockPI.update).not.toHaveBeenCalled()
    })

    it('skips ingredient not present in pantry', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-gin', 'gin', 70)])

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'tonic', amount: 15, unit: 'cl' }])

        expect(mockPI.update).not.toHaveBeenCalled()
    })

    it('skips optional ingredient usage', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-gin', 'gin', 70)])

        await pantryRepository.decrementForCocktail('user-1', [
            { ingredientId: 'gin', amount: 6, unit: 'cl', optional: true },
        ])

        expect(mockPI.update).not.toHaveBeenCalled()
    })

    it('returns immediately when pantry is empty', async () => {
        mockPI.findMany.mockResolvedValue([])

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'gin', amount: 6, unit: 'cl' }])

        expect(mockPI.update).not.toHaveBeenCalled()
    })

    it('skips when convertUnit returns null (incompatible units)', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-1', 'gin', 70, 'cl')])
        mockConvertUnit.mockReturnValueOnce(null)

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'gin', amount: 10, unit: 'g' }])

        expect(mockPI.update).not.toHaveBeenCalled()
    })

    it('converts units before deducting (60ml → 6cl)', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-1', 'gin', 70, 'cl')])
        mockPI.update.mockResolvedValue({})

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'gin', amount: 60, unit: 'ml' }])

        expect(mockPI.update).toHaveBeenCalledWith({ where: { id: 'pi-1' }, data: { quantity: 64 } })
    })

    it('falls back to derivation base ingredient when direct ingredient not in pantry', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-bottle', 'vodka-bottle', 3, 'pcs')])
        mockPI.update.mockResolvedValue({})
        mockGetDerivationMap.mockResolvedValue(new Map([
            ['vodka-shot', [{ baseIngredientId: 'vodka-bottle', yieldAmount: 1, yieldUnit: 'pcs' }]],
        ]))

        await pantryRepository.decrementForCocktail('user-1', [
            { ingredientId: 'vodka-shot', amount: 1, unit: 'pcs' },
        ])

        expect(mockPI.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'pi-bottle' } })
        )
    })

    it('skips derivation when base ingredient is also absent', async () => {
        mockPI.findMany.mockResolvedValue([])
        mockGetDerivationMap.mockResolvedValue(new Map([
            ['vodka-shot', [{ baseIngredientId: 'vodka-bottle', yieldAmount: 1, yieldUnit: 'pcs' }]],
        ]))

        await pantryRepository.decrementForCocktail('user-1', [
            { ingredientId: 'vodka-shot', amount: 1, unit: 'pcs' },
        ])

        expect(mockPI.update).not.toHaveBeenCalled()
    })

    it('skips decrement when pantry item isInfinite (direct match)', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-water', 'water', 0, 'cl', true)])

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'water', amount: 5, unit: 'cl' }])

        expect(mockPI.update).not.toHaveBeenCalled()
    })

    it('skips decrement when derived base item isInfinite', async () => {
        mockPI.findMany.mockResolvedValue([row('pi-base', 'base-spirit', 0, 'cl', true)])
        mockGetDerivationMap.mockResolvedValue(new Map([
            ['derived-spirit', [{ baseIngredientId: 'base-spirit', yieldAmount: 1, yieldUnit: 'cl' }]],
        ]))

        await pantryRepository.decrementForCocktail('user-1', [{ ingredientId: 'derived-spirit', amount: 3, unit: 'cl' }])

        expect(mockPI.update).not.toHaveBeenCalled()
    })
})

describe('PantryRepository.findMany filters', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockPI.findMany.mockResolvedValue([])
        mockPI.count.mockResolvedValue(0)
    })

    it('maps scope status=shopping to isInShoppingList', async () => {
        await pantryRepository.findMany({
            filters: { userId: 'user-1', status: 'shopping' },
        })

        expect(mockPI.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                userId: 'user-1',
                isInShoppingList: true,
            }),
        }))
    })

    it('applies stockStatus filter without removing shopping scope', async () => {
        await pantryRepository.findMany({
            filters: { userId: 'user-1', status: 'shopping', stockStatus: 'expiring' },
        })

        expect(mockPI.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                userId: 'user-1',
                isInShoppingList: true,
                expirationDate: expect.objectContaining({
                    gt: expect.any(Date),
                    lt: expect.any(Date),
                }),
            }),
        }))
    })

    it('keeps backward compatibility for legacy status=low-stock links', async () => {
        await pantryRepository.findMany({
            filters: { userId: 'user-1', status: 'low-stock' },
        })

        expect(mockPI.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                userId: 'user-1',
                isInPantry: true,
                OR: expect.any(Array),
            }),
        }))
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('PantryRepository.importIngredientsIntoEmptyPantry', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        setupTx()
    })

    it('creates infinite in-pantry items for the ingredients that exist', async () => {
        mockPI.count.mockResolvedValue(0)
        mockIngredient.findMany.mockResolvedValue([
            { id: 'gin', name: 'Gin', isAlcoholic: true, type: { name: 'Spirit' }, subType: null },
            { id: 'lime', name: 'Lime', isAlcoholic: false, type: { name: 'Fresh produce' }, subType: null },
        ])
        mockPI.createMany.mockResolvedValue({ count: 2 })

        const imported = await pantryRepository.importIngredientsIntoEmptyPantry('user-1', ['gin', 'lime', 'ghost'])

        expect(imported).toBe(2)
        expect(mockIngredient.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: { in: ['gin', 'lime', 'ghost'] } },
        }))
        const { data, skipDuplicates } = mockPI.createMany.mock.calls[0][0]
        expect(skipDuplicates).toBe(true)
        expect(data).toHaveLength(2)
        expect(data[0]).toEqual(expect.objectContaining({
            userId: 'user-1', ingredientId: 'gin', isInPantry: true, isInfinite: true,
        }))
    })

    it('imports nothing when the user already has pantry items', async () => {
        mockPI.count.mockResolvedValue(1)

        const imported = await pantryRepository.importIngredientsIntoEmptyPantry('user-1', ['gin'])

        expect(imported).toBe(0)
        expect(mockIngredient.findMany).not.toHaveBeenCalled()
        expect(mockPI.createMany).not.toHaveBeenCalled()
    })

    it('imports nothing when no id matches an ingredient', async () => {
        mockPI.count.mockResolvedValue(0)
        mockIngredient.findMany.mockResolvedValue([])

        const imported = await pantryRepository.importIngredientsIntoEmptyPantry('user-1', ['ghost'])

        expect(imported).toBe(0)
        expect(mockPI.createMany).not.toHaveBeenCalled()
    })
})
