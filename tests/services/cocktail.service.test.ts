/**
 * Cocktail service tests — repository, prisma, and derivation cache are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError } from '@/utils/errors'

const { mockCocktailRepo, mockGetDerivationMap } = vi.hoisted(() => {
    return {
        mockCocktailRepo: {
            findMany:            vi.fn(),
            findWithFullDetails: vi.fn(),
            findPantryItemsForMakeable: vi.fn(),
            findMakeable:        vi.fn(),
            create:              vi.fn(),
            update:              vi.fn(),
            hardDelete:          vi.fn(),
            deletePreservingMadeLogStats: vi.fn(),
            exists:              vi.fn(),
            syncBarTools:        vi.fn(),
            syncIngredients:     vi.fn(),
        },
        mockGetDerivationMap: vi.fn(),
    }
})

vi.mock('@/repositories/cocktail.repository', () => ({ cocktailRepository: mockCocktailRepo }))
vi.mock('@/lib/derivations/derivation-cache', () => ({ getDerivationMap: mockGetDerivationMap }))

import { cocktailService } from '@/services/cocktail.service'

const UID        = 'user-1'
const COCKTAIL_ID = 'cocktail-martini'

// ════════════════════════════════════════════════════════════════════════════
describe('CocktailService.getById', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns the cocktail when found', async () => {
        const cocktail = { id: COCKTAIL_ID, name: 'Martini' }
        mockCocktailRepo.findWithFullDetails.mockResolvedValue(cocktail)
        await expect(cocktailService.getById(COCKTAIL_ID)).resolves.toBe(cocktail)
        expect(mockCocktailRepo.findWithFullDetails).toHaveBeenCalledWith(COCKTAIL_ID)
    })

    it('throws NotFoundError when cocktail does not exist', async () => {
        mockCocktailRepo.findWithFullDetails.mockResolvedValue(null)
        await expect(cocktailService.getById('nope')).rejects.toThrow(NotFoundError)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('CocktailService.getAll', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('delegates to cocktailRepository.findMany with the given params', async () => {
        const result = { data: [], meta: { total: 0 } }
        mockCocktailRepo.findMany.mockResolvedValue(result)

        const params = { page: 1, limit: 20 } as any
        await expect(cocktailService.getAll(params)).resolves.toBe(result)
        expect(mockCocktailRepo.findMany).toHaveBeenCalledWith(params)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('CocktailService.create', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('strips ingredients and barToolIds before passing to repository', async () => {
        const created = { id: COCKTAIL_ID, name: 'Martini' }
        mockCocktailRepo.create.mockResolvedValue(created)

        const input = {
            name:       'Martini',
            flavors:    ['dry'],
            occasions:  ['aperitif'],
            technique:  ['stir'],
            ingredients: [{ ingredientId: 'gin', amount: 60, unit: 'ml' }],
            barToolIds:  ['shaker-id'],
        } as any

        const result = await cocktailService.create(input)

        expect(result).toBe(created)
        const callArg = mockCocktailRepo.create.mock.calls[0][0]
        expect(callArg).not.toHaveProperty('ingredients')
        expect(callArg).not.toHaveProperty('barToolIds')
        expect(callArg).toMatchObject({ name: 'Martini' })
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('CocktailService.update', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('throws NotFoundError when cocktail does not exist', async () => {
        mockCocktailRepo.update.mockResolvedValue(null)
        await expect(
            cocktailService.update('nope', { name: 'X' } as any)
        ).rejects.toThrow(NotFoundError)
    })

    it('strips ingredients and barToolIds before passing to repository', async () => {
        const updated = { id: COCKTAIL_ID, name: 'Martini Updated' }
        mockCocktailRepo.update.mockResolvedValue(updated)

        const input = {
            name:        'Martini Updated',
            ingredients: [{ ingredientId: 'gin', amount: 60, unit: 'ml' }],
            barToolIds:  ['shaker-id'],
        } as any

        const result = await cocktailService.update(COCKTAIL_ID, input)

        expect(result).toBe(updated)
        const callArg = mockCocktailRepo.update.mock.calls[0][1]
        expect(callArg).not.toHaveProperty('ingredients')
        expect(callArg).not.toHaveProperty('barToolIds')
    })

    it('returns the updated cocktail on success', async () => {
        const updated = { id: COCKTAIL_ID, name: 'Negroni' }
        mockCocktailRepo.update.mockResolvedValue(updated)
        await expect(
            cocktailService.update(COCKTAIL_ID, { name: 'Negroni' } as any)
        ).resolves.toBe(updated)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('CocktailService.delete', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('resolves without error when cocktail is found and deleted', async () => {
        mockCocktailRepo.deletePreservingMadeLogStats.mockResolvedValue(true)
        await expect(cocktailService.delete(COCKTAIL_ID)).resolves.not.toThrow()
        expect(mockCocktailRepo.deletePreservingMadeLogStats).toHaveBeenCalledWith(COCKTAIL_ID)
    })

    it('throws NotFoundError when cocktail does not exist', async () => {
        mockCocktailRepo.deletePreservingMadeLogStats.mockResolvedValue(false)
        await expect(cocktailService.delete('nope')).rejects.toThrow(NotFoundError)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('CocktailService.getMakeable', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('fetches pantry items and derivation map, then delegates to repository', async () => {
        const pantryItems   = [{ ingredientId: 'gin', quantity: 70, unitLeft: 'cl' }]
        const derivationMap = new Map()
        const makeable      = [{ id: 'c-1', missingCount: 0 }]

        mockCocktailRepo.findPantryItemsForMakeable.mockResolvedValue(pantryItems)
        mockGetDerivationMap.mockResolvedValue(derivationMap)
        mockCocktailRepo.findMakeable.mockResolvedValue(makeable)

        const result = await cocktailService.getMakeable(UID)

        expect(mockCocktailRepo.findPantryItemsForMakeable).toHaveBeenCalledWith(UID)
        expect(mockGetDerivationMap).toHaveBeenCalled()
        expect(mockCocktailRepo.findMakeable).toHaveBeenCalledWith(
            ['gin'], 3, derivationMap, 200,
            expect.any(Map)
        )
        expect(result).toBe(makeable)
    })

    it('excludes pantry items missing quantity or unit from the quantities map', async () => {
        const pantryItems = [
            { ingredientId: 'gin',  quantity: 70,   unitLeft: 'cl' },
            { ingredientId: 'rum',  quantity: null,  unitLeft: 'cl' },
            { ingredientId: 'lime', quantity: 5,     unitLeft: null },
        ]
        mockCocktailRepo.findPantryItemsForMakeable.mockResolvedValue(pantryItems)
        mockGetDerivationMap.mockResolvedValue(new Map())
        mockCocktailRepo.findMakeable.mockResolvedValue([])

        await cocktailService.getMakeable(UID)

        const passedMap: Map<string, any> = mockCocktailRepo.findMakeable.mock.calls[0][4]
        expect(passedMap.has('gin')).toBe(true)
        expect(passedMap.has('rum')).toBe(false)
        expect(passedMap.has('lime')).toBe(false)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('CocktailService.getBestMakeable', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns top 10 sorted by missingCount then avgRating', async () => {
        mockCocktailRepo.findPantryItemsForMakeable.mockResolvedValue([])
        mockGetDerivationMap.mockResolvedValue(new Map())

        // 12 cocktails — result should be top 10
        const makeable = Array.from({ length: 12 }, (_, i) => ({
            id:           `c-${i}`,
            missingCount: i % 3, // 0, 1, 2, 0, 1, 2, ...
            avgRating:    5 - i * 0.3,
            ratingCount:  10,
        }))
        mockCocktailRepo.findMakeable.mockResolvedValue(makeable)

        const result = await cocktailService.getBestMakeable(UID)

        expect(result).toHaveLength(10)
        // First item should have the lowest missingCount
        expect(result[0].missingCount).toBeLessThanOrEqual(result[result.length - 1].missingCount)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('CocktailService.syncBarTools', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('throws NotFoundError when cocktail does not exist', async () => {
        mockCocktailRepo.exists.mockResolvedValue(false)
        await expect(
            cocktailService.syncBarTools(COCKTAIL_ID, ['tool-1'])
        ).rejects.toThrow(NotFoundError)
        expect(mockCocktailRepo.syncBarTools).not.toHaveBeenCalled()
    })

    it('delegates to repository sync method', async () => {
        mockCocktailRepo.exists.mockResolvedValue(true)

        await cocktailService.syncBarTools(COCKTAIL_ID, ['tool-1', 'tool-2'])

        expect(mockCocktailRepo.syncBarTools).toHaveBeenCalledWith(COCKTAIL_ID, ['tool-1', 'tool-2'])
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('CocktailService.syncIngredients', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('throws NotFoundError when cocktail does not exist', async () => {
        mockCocktailRepo.exists.mockResolvedValue(false)
        await expect(
            cocktailService.syncIngredients(COCKTAIL_ID, [])
        ).rejects.toThrow(NotFoundError)
    })

    it('delegates to repository sync method', async () => {
        mockCocktailRepo.exists.mockResolvedValue(true)

        const ingredients = [
            { ingredientId: 'gin', amount: 60, unit: 'ml', optional: false, substitutes: [] },
        ]

        await cocktailService.syncIngredients(COCKTAIL_ID, ingredients)

        expect(mockCocktailRepo.syncIngredients).toHaveBeenCalledWith(COCKTAIL_ID, ingredients)
    })
})
