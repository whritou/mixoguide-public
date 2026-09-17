/**
 * Pantry service tests — repositories are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { NotFoundError, ForbiddenError } from '@/utils/errors'

const { mockPantryRepo, mockPrisma, mockTx } = vi.hoisted(() => {
    const mockTx = {
        ingredient: { findUnique: vi.fn() },
        userPantryItem: {},
    }
    return {
        mockPantryRepo: {
            findMany:               vi.fn(),
            findById:               vi.fn(),
            createItem:             vi.fn(),
            update:                 vi.fn(),
            hardDelete:             vi.fn(),
            findByUserAndIngredient: vi.fn(),
            findShoppingListItem:   vi.fn(),
            decrementForCocktail:   vi.fn(),
        },
        mockPrisma: {
            $transaction: vi.fn(async (
                cb: (tx: typeof mockTx) => Promise<unknown>,
                _options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
            ) => cb(mockTx)),
        },
        mockTx,
    }
})

vi.mock('@/repositories/pantry.repository', () => ({ pantryRepository: mockPantryRepo }))
vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma }))

import { pantryService } from '@/services/pantry.service'

const UID = 'user-1'
const ING = 'ing-gin'

beforeEach(() => {
    mockPrisma.$transaction.mockImplementation(async (
        cb: (tx: typeof mockTx) => Promise<unknown>,
        _options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
    ) => cb(mockTx))
    mockTx.ingredient.findUnique.mockResolvedValue(null)
})

// ════════════════════════════════════════════════════════════════════════════
describe('PantryService.create', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('calls createItem with the provided data and returns the new item when no existing item', async () => {
        mockPantryRepo.findByUserAndIngredient.mockResolvedValue(null)
        const created = { id: 'pi-1', userId: UID, ingredientId: ING, isInPantry: true }
        mockPantryRepo.createItem.mockResolvedValue(created)

        const result = await pantryService.upsert(UID, ING, {
            quantity: 50, unitLeft: 'cl', isInPantry: true, isInShoppingList: false,
        })

        expect(mockPantryRepo.findByUserAndIngredient).toHaveBeenCalledWith(UID, ING, mockTx)
        expect(mockPantryRepo.createItem).toHaveBeenCalledWith(UID, ING, expect.objectContaining({
            quantity: 50, unitLeft: 'cl', isInPantry: true,
        }), mockTx)
        expect(result).toBe(created)
    })

    it('creates a shopping list item when no existing item', async () => {
        mockPantryRepo.findByUserAndIngredient.mockResolvedValue(null)
        mockPantryRepo.createItem.mockResolvedValue({ id: 'pi-2', isInShoppingList: true })

        await pantryService.upsert(UID, ING, {
            quantity: 20, unitLeft: 'cl', isInPantry: false, isInShoppingList: true,
        })

        expect(mockPantryRepo.createItem).toHaveBeenCalledWith(UID, ING, expect.objectContaining({
            isInPantry: false, isInShoppingList: true,
        }), mockTx)
    })

    it('looks up existing items before creating', async () => {
        mockPantryRepo.findByUserAndIngredient.mockResolvedValue(null)
        mockPantryRepo.createItem.mockResolvedValue({ id: 'pi-3' })

        await pantryService.upsert(UID, ING, { quantity: 10, unitLeft: 'cl', isInPantry: true })

        expect(mockPantryRepo.findByUserAndIngredient).toHaveBeenCalledWith(UID, ING, mockTx)
    })

    it('aggregates quantities when adding to existing pantry item', async () => {
        const existing = { id: 'pi-existing', userId: UID, ingredientId: ING, quantity: 50, unitLeft: 'cl', isInPantry: true }
        mockPantryRepo.findByUserAndIngredient.mockResolvedValue(existing)
        mockPantryRepo.update.mockResolvedValue({ ...existing, quantity: 80 })

        await pantryService.upsert(UID, ING, { quantity: 30, unitLeft: 'cl', isInPantry: true })

        expect(mockPantryRepo.update).toHaveBeenCalledWith('pi-existing', expect.objectContaining({
            quantity: 80, isInPantry: true
        }), mockTx)
    })

    it('aggregates shopping quantities when adding to existing shopping list item', async () => {
        const existing = { id: 'pi-existing', userId: UID, ingredientId: ING, quantity: 0, shoppingQuantity: 10, unitLeft: 'cl', isInShoppingList: true }
        mockPantryRepo.findByUserAndIngredient.mockResolvedValue(existing)
        mockPantryRepo.update.mockResolvedValue({ ...existing, shoppingQuantity: 25 })

        await pantryService.upsert(UID, ING, { quantity: 15, unitLeft: 'cl', isInShoppingList: true })

        expect(mockPantryRepo.update).toHaveBeenCalledWith('pi-existing', expect.objectContaining({
            shoppingQuantity: 25, isInShoppingList: true
        }), mockTx)
    })

    it('uses a serializable transaction for concurrent quantity aggregation', async () => {
        let quantity = 10
        let transactionQueue = Promise.resolve()

        mockPrisma.$transaction.mockImplementation((async (
            cb: (tx: typeof mockTx) => Promise<unknown>,
            _options: { isolationLevel?: Prisma.TransactionIsolationLevel },
        ) => {
            const run = transactionQueue.then(() => cb(mockTx))
            transactionQueue = run.then(() => undefined, () => undefined)
            return run
        }) as typeof mockPrisma.$transaction)

        mockPantryRepo.findByUserAndIngredient.mockImplementation(async () => ({
            id: 'pi-existing',
            userId: UID,
            ingredientId: ING,
            quantity,
            shoppingQuantity: 0,
            unitLeft: 'cl',
            isInPantry: true,
        }))
        mockPantryRepo.update.mockImplementation(async (_id, data) => {
            quantity = Number(data.quantity)
            return { id: 'pi-existing', quantity }
        })

        await Promise.all([
            pantryService.upsert(UID, ING, { quantity: 30, unitLeft: 'cl', isInPantry: true }),
            pantryService.upsert(UID, ING, { quantity: 40, unitLeft: 'cl', isInPantry: true }),
        ])

        expect(quantity).toBe(80)
        expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2)
        for (const [, options] of mockPrisma.$transaction.mock.calls) {
            expect(options).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
        }
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('PantryService.addItemsBulk', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockPantryRepo.findByUserAndIngredient.mockResolvedValue(null)
    })

    it('creates a shopping list row for shopping destination', async () => {
        mockPantryRepo.createItem.mockResolvedValue({})

        await pantryService.addItemsBulk(UID, [
            { ingredientId: 'gin', destination: 'shopping', shoppingQuantity: 50, quantity: 0, unit: 'cl' },
        ])

        expect(mockPantryRepo.createItem).toHaveBeenCalledWith(UID, 'gin', expect.objectContaining({
            isInPantry: false, isInShoppingList: true, quantity: 0, unitLeft: 'cl',
        }), mockTx)
    })

    it('creates a pantry row for pantry destination', async () => {
        mockPantryRepo.createItem.mockResolvedValue({})

        await pantryService.addItemsBulk(UID, [
            { ingredientId: 'gin', destination: 'pantry', shoppingQuantity: 0, quantity: 50, unit: 'cl' },
        ])

        expect(mockPantryRepo.createItem).toHaveBeenCalledWith(UID, 'gin', expect.objectContaining({
            isInPantry: true, isInShoppingList: false, quantity: 50,
        }), mockTx)
    })

    it('checks for existing items before creating — aggregates quantities if found', async () => {
        mockPantryRepo.findByUserAndIngredient.mockResolvedValue({ id: 'existing', quantity: 10, shoppingQuantity: 5 })
        mockPantryRepo.update.mockResolvedValue({})

        await pantryService.addItemsBulk(UID, [
            { ingredientId: 'gin', destination: 'pantry', shoppingQuantity: 10, quantity: 20, unit: 'cl' },
        ])

        expect(mockPantryRepo.findByUserAndIngredient).toHaveBeenCalledWith(UID, 'gin', mockTx)
        expect(mockPantryRepo.update).toHaveBeenCalled()
    })

    it('handles mixed destinations in one call', async () => {
        mockPantryRepo.createItem.mockResolvedValue({})

        await pantryService.addItemsBulk(UID, [
            { ingredientId: 'gin',   destination: 'shopping', shoppingQuantity: 10, quantity: 20, unit: 'cl' },
            { ingredientId: 'tonic', destination: 'pantry', shoppingQuantity: 0, quantity: 50, unit: 'cl' },
            { ingredientId: 'lime',  destination: 'pantry', shoppingQuantity: 10,   quantity: 5,  unit: 'pcs' },
        ])

        expect(mockPantryRepo.createItem).toHaveBeenCalledTimes(3)
    })

    it('returns correct addedToShopping and addedToPantry counts', async () => {
        mockPantryRepo.createItem.mockResolvedValue({})

        const result = await pantryService.addItemsBulk(UID, [
            { ingredientId: 'gin',   destination: 'shopping', shoppingQuantity: 50, quantity: 20, unit: 'cl' },
            { ingredientId: 'tonic', destination: 'pantry', shoppingQuantity: 0, quantity: 50, unit: 'cl' },
            { ingredientId: 'lime',  destination: 'pantry', shoppingQuantity: 2, quantity: 5,  unit: 'pcs' },
        ])

        expect(result).toEqual({ addedToShopping: 1, addedToPantry: 2 })
    })

    it('can add same ingredient to both destinations in one call', async () => {
        mockPantryRepo.createItem.mockResolvedValue({})

        const result = await pantryService.addItemsBulk(UID, [
            { ingredientId: 'gin', destination: 'pantry', shoppingQuantity: 10, quantity: 50, unit: 'cl' },
            { ingredientId: 'gin', destination: 'shopping', shoppingQuantity: 15, quantity: 20, unit: 'cl' },
        ])

        expect(mockPantryRepo.createItem).toHaveBeenCalledTimes(2)
        expect(result).toEqual({ addedToShopping: 1, addedToPantry: 1 })
    })

    it('returns zeros for empty items array', async () => {
        const result = await pantryService.addItemsBulk(UID, [])
        expect(result).toEqual({ addedToShopping: 0, addedToPantry: 0 })
        expect(mockPantryRepo.createItem).not.toHaveBeenCalled()
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('PantryService.getById', () => {
    it('throws NotFoundError when item is not found', async () => {
        mockPantryRepo.findById.mockResolvedValue(null)
        await expect(pantryService.getById('nonexistent')).rejects.toThrow(NotFoundError)
    })

    it('returns the item when found', async () => {
        const item = { id: 'pi-1', userId: UID }
        mockPantryRepo.findById.mockResolvedValue(item)
        await expect(pantryService.getById('pi-1')).resolves.toBe(item)
    })
})

describe('PantryService.update', () => {
    it('throws NotFoundError when item is not found', async () => {
        mockPantryRepo.update.mockResolvedValue(null)
        await expect(pantryService.update('nonexistent', { quantity: 10 })).rejects.toThrow(NotFoundError)
    })

    it('returns updated item on success', async () => {
        const updated = { id: 'pi-1', quantity: 10 }
        mockPantryRepo.update.mockResolvedValue(updated)
        await expect(pantryService.update('pi-1', { quantity: 10 })).resolves.toBe(updated)
    })
})

describe('PantryService.delete', () => {
    it('throws NotFoundError when item does not exist', async () => {
        mockPantryRepo.findById.mockResolvedValue(null)

        await expect(pantryService.delete('nonexistent')).rejects.toThrow(NotFoundError)
        expect(mockPantryRepo.hardDelete).not.toHaveBeenCalled()
    })

    it('resolves without error on successful delete', async () => {
        mockPantryRepo.findById.mockResolvedValue({ id: 'pi-1', userId: UID })
        mockPantryRepo.hardDelete.mockResolvedValue(true)

        await expect(pantryService.delete('pi-1')).resolves.not.toThrow()
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('PantryService.assertOwnership', () => {
    it('throws ForbiddenError when user does not own the item', () => {
        expect(() => pantryService.assertOwnership({ userId: 'user-2' }, UID, false)).toThrow(ForbiddenError)
    })

    it('does not throw when user owns the item', () => {
        expect(() => pantryService.assertOwnership({ userId: UID }, UID, false)).not.toThrow()
    })

    it('does not throw for admin regardless of ownership', () => {
        expect(() => pantryService.assertOwnership({ userId: 'other' }, UID, true)).not.toThrow()
    })
})
