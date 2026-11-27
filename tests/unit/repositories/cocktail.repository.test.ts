import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
    mockCocktail,
    mockIngredient,
    mockPrisma,
    mockConvertUnit,
    mockFindFulfillingIngredient,
    mockGetDerivableAmount,
    mockGetIngredientCatalog,
} = vi.hoisted(() => {
    const mockCocktail = {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        upsert: vi.fn(),
    }
    const mockIngredient = {
        findMany: vi.fn(),
    }
    return {
        mockCocktail,
        mockIngredient,
        mockPrisma: {
            cocktail: mockCocktail,
            ingredient: mockIngredient,
            $queryRaw: vi.fn(),
        },
        mockGetIngredientCatalog: vi.fn(),
        mockConvertUnit: vi.fn((amount: number, from: string, to: string) => from === to ? amount : null),
        mockFindFulfillingIngredient: vi.fn(() => null),
        mockGetDerivableAmount: vi.fn(),
    }
})

vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/derivations/derivation-cache', () => ({
    convertUnit: mockConvertUnit,
    findFulfillingIngredient: mockFindFulfillingIngredient,
    getDerivableAmount: mockGetDerivableAmount,
    getIngredientCatalog: mockGetIngredientCatalog,
}))

import { cocktailRepository } from '@/repositories/cocktail.repository'

function cocktailRow(id: string, ingredients: unknown[]) {
    return {
        id,
        name: id,
        description: null,
        imageUrl: null,
        isAlcoholic: true,
        source: 'custom',
        difficulty: 'easy',
        preparationTime: null,
        flavors: [],
        occasions: [],
        technique: [],
        origin: null,
        glassId: null,
        mainAlcoholId: null,
        avgRating: null,
        ratingCount: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        ingredients,
    }
}

function ingredientRow(
    ingredientId: string,
    name: string,
    amount: number | null,
    unit: string | null,
    typeName: string,
    subTypeName: string | null = null,
) {
    return {
        ingredientId,
        amount,
        unit,
        optional: false,
        substitutes: [],
        ingredient: {
            id: ingredientId,
            name,
            type: { name: typeName },
            subType: subTypeName ? { name: subTypeName } : null,
        },
    }
}

/**
 * The SQL coverage query ($queryRaw) is not executed in unit tests: by default it
 * returns every cocktail currently served by `mockCocktail.findMany` as a
 * candidate with an existence-based missing count of 0.
 */
function candidatesFromFindMany() {
    mockPrisma.$queryRaw.mockImplementation(async () => {
        const rows = (await mockCocktail.findMany.getMockImplementation()?.({})) ?? []
        return (rows as Array<{ id: string }>).map((r) => ({ id: r.id, missing: 0 }))
    })
}

describe('CocktailRepository.findMakeable', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockIngredient.findMany.mockResolvedValue([])
        mockGetIngredientCatalog.mockResolvedValue({ byId: new Map(), nonBlockingIds: [] })
        candidatesFromFindMany()
    })

    it('does not count garnishes or null-amount ingredients as missing', async () => {
        mockCocktail.findMany.mockResolvedValue([
            cocktailRow('martini', [
                ingredientRow('gin', 'Gin', 5, 'cl', 'Spirit'),
                ingredientRow('lemon-peel', 'Lemon Peel', null, 'twist', 'Garnish', 'Citrus Twist / Peel'),
                ingredientRow('orange-peel', 'Orange Peel', 1, 'twist', 'Garnish', 'Citrus Twist / Peel'),
                ingredientRow('sugar', 'Sugar', null, 'pcs', 'Sweetener'),
            ]),
        ])

        const result = await cocktailRepository.findMakeable(
            ['gin'],
            3,
            new Map(),
            200,
            new Map([['gin', { quantity: 6, unit: 'cl' }]]),
        )

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
            id: 'martini',
            makeableStatus: 'full',
            missingCount: 0,
            requiredCount: 1,
            satisfiedCount: 1,
            missingIngredients: [],
        })
    })

    it('still treats measured non-garnish ingredients as required', async () => {
        mockCocktail.findMany.mockResolvedValue([
            cocktailRow('bijou', [
                ingredientRow('gin', 'Gin', 3, 'cl', 'Spirit'),
                ingredientRow('vermouth', 'Sweet Vermouth', 3, 'cl', 'Fortified Wine', 'Sweet Vermouth'),
            ]),
        ])

        const result = await cocktailRepository.findMakeable(
            ['gin'],
            3,
            new Map(),
            200,
            new Map([['gin', { quantity: 6, unit: 'cl' }]]),
        )

        expect(result[0]).toMatchObject({
            missingCount: 1,
            requiredCount: 2,
            satisfiedCount: 1,
            missingIngredients: [{ id: 'vermouth', name: 'Sweet Vermouth' }],
        })
    })

    it('does not ignore olive brine just because the seed data labels it as garnish', async () => {
        mockCocktail.findMany.mockResolvedValue([
            cocktailRow('dirty-martini', [
                ingredientRow('vodka', 'Vodka', 6, 'cl', 'Spirit'),
                ingredientRow('olive-brine', 'Olive Brine', 1, 'cl', 'Garnish', 'Olive & Onion'),
            ]),
        ])

        const result = await cocktailRepository.findMakeable(
            ['vodka'],
            3,
            new Map(),
            200,
            new Map([['vodka', { quantity: 8, unit: 'cl' }]]),
        )

        expect(result[0]).toMatchObject({
            missingCount: 1,
            requiredCount: 2,
            missingIngredients: [{ id: 'olive-brine', name: 'Olive Brine' }],
        })
    })

    it('loads ingredient type metadata needed by the non-blocking rule', async () => {
        mockCocktail.findMany.mockResolvedValue([])
        mockPrisma.$queryRaw.mockResolvedValue([{ id: 'x', missing: 0 }])

        await cocktailRepository.findMakeable(['gin'])

        expect(mockCocktail.findMany).toHaveBeenCalledWith(expect.objectContaining({
            select: expect.objectContaining({
                ingredients: {
                    select: expect.objectContaining({
                        ingredient: {
                            select: expect.objectContaining({
                                type: { select: { name: true } },
                                subType: { select: { name: true } },
                            }),
                        },
                    }),
                },
            }),
        }))
    })
})

describe('CocktailRepository.findMakeable — SQL coverage (DB-003)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetIngredientCatalog.mockResolvedValue({
            byId: new Map([['gin', { id: 'gin', name: 'Gin', isAlcoholic: true, type: null, subType: null }]]),
            nonBlockingIds: ['lemon-peel'],
        })
    })

    it('skips the database entirely for an empty pantry', async () => {
        expect(await cocktailRepository.findMakeable([])).toEqual([])
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()
    })

    it('passes direct + derivable ingredient ids, garnish ids and maxMissing as bound parameters', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([])
        const derivations = new Map([
            ['lime-juice', [{ baseIngredientId: 'lime', yieldAmount: 3, yieldUnit: 'cl', requiresTool: null }]],
        ])

        await cocktailRepository.findMakeable(['lime', 'gin'], 2, derivations as never)

        const sql = mockPrisma.$queryRaw.mock.calls[0][0] as { strings: string[]; values: unknown[] }
        expect(sql.strings.join('?')).toMatch(/GROUP BY ci\.cocktail_id/)
        expect(sql.values).toEqual([
            ['lime', 'gin', 'lime-juice'],
            ['lime', 'gin', 'lime-juice'],
            ['lemon-peel'],
            2,
        ])
        expect(mockCocktail.findMany).not.toHaveBeenCalled()
    })

    it('hydrates candidates level by level and stops once the top results are known', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([
            { id: 'a', missing: 0 },
            { id: 'b', missing: 0 },
            { id: 'c', missing: 1 },
        ])
        mockCocktail.findMany.mockImplementation(async (args: { where: { id: { in: string[] } } }) =>
            args.where.id.in.map((id) => cocktailRow(id, [ingredientRow('gin', 'Gin', 5, 'cl', 'Spirit')])),
        )

        const result = await cocktailRepository.findMakeable(['gin'], 3, new Map(), 2)

        expect(mockCocktail.findMany).toHaveBeenCalledTimes(1)
        expect(mockCocktail.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['a', 'b'] } } }))
        expect(result.map((r) => r.id)).toEqual(['a', 'b'])
    })

    it('keeps evaluating the next level when quantities make level-0 candidates miss', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([
            { id: 'low-stock', missing: 0 },
            { id: 'other', missing: 1 },
        ])
        mockCocktail.findMany.mockImplementation(async (args: { where: { id: { in: string[] } } }) =>
            args.where.id.in.map((id) => cocktailRow(id, id === 'low-stock'
                ? [ingredientRow('gin', 'Gin', 5, 'cl', 'Spirit'), ingredientRow('lime', 'Lime Juice', 2, 'cl', 'Juice')]
                : [ingredientRow('lime', 'Lime Juice', 2, 'cl', 'Juice'), ingredientRow('vermouth', 'Vermouth', 3, 'cl', 'Wine')])),
        )

        const result = await cocktailRepository.findMakeable(
            ['gin', 'lime'], 3, new Map(), 1,
            // Not enough gin: 'low-stock' is missing 1 once quantities are checked.
            new Map([['gin', { quantity: 1, unit: 'cl' }], ['lime', { quantity: 10, unit: 'cl' }]]),
        )

        // Both levels hydrated; results are deterministic (missing count, then name).
        expect(mockCocktail.findMany).toHaveBeenCalledTimes(2)
        expect(result.map((r) => [r.id, r.missingCount])).toEqual([['low-stock', 1]])
    })

    it('orders ties deterministically by name', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([
            { id: 'z', missing: 0 },
            { id: 'a', missing: 0 },
        ])
        mockCocktail.findMany.mockImplementation(async (args: { where: { id: { in: string[] } } }) =>
            args.where.id.in.map((id) => cocktailRow(id, [ingredientRow('gin', 'Gin', 5, 'cl', 'Spirit')])),
        )

        const result = await cocktailRepository.findMakeable(['gin'])

        expect(result.map((r) => r.id)).toEqual(['a', 'z'])
    })
})

describe('CocktailRepository.findMakeableTarget', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        const actual = await vi.importActual<typeof import('@/lib/derivations/derivation-cache')>('@/lib/derivations/derivation-cache')
        mockFindFulfillingIngredient.mockImplementation(actual.findFulfillingIngredient as never)
    })

    afterEach(() => {
        mockFindFulfillingIngredient.mockImplementation(() => null)
    })

    const daiquiri = cocktailRow('daiquiri', [
        ingredientRow('rum', 'White Rum', 6, 'cl', 'Spirit'),
        ingredientRow('lime-juice', 'Lime Juice', 3, 'cl', 'Juice'),
        ingredientRow('syrup', 'Simple Syrup', 2, 'cl', 'Sweetener'),
        ingredientRow('lime-wheel', 'Lime Wheel', null, 'pcs', 'Garnish'),
    ])
    const derivations = new Map([
        ['lime-juice', [{ baseIngredientId: 'lime', yieldAmount: 3, yieldUnit: 'cl' as never, requiresTool: null }]],
    ])

    it('counts Lime as covering Lime Juice through the derivation map', async () => {
        mockCocktail.findUnique.mockResolvedValue(daiquiri)

        const result = await cocktailRepository.findMakeableTarget('daiquiri', ['rum', 'lime', 'syrup'], derivations as never)

        expect(result).toEqual({ requiredCount: 3, missing: [] })
        expect(mockCocktail.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'daiquiri' } }))
    })

    it('lists required ingredients that nothing covers', async () => {
        mockCocktail.findUnique.mockResolvedValue(daiquiri)

        const result = await cocktailRepository.findMakeableTarget('daiquiri', ['rum'], derivations as never)

        expect(result).toEqual({
            requiredCount: 3,
            missing: [{ id: 'lime-juice', name: 'Lime Juice' }, { id: 'syrup', name: 'Simple Syrup' }],
        })
    })

    it('returns null for an unknown cocktail', async () => {
        mockCocktail.findUnique.mockResolvedValue(null)

        expect(await cocktailRepository.findMakeableTarget('nope', ['rum'], new Map())).toBeNull()
    })
})
