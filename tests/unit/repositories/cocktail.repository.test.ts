import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
    mockCocktail,
    mockIngredient,
    mockPrisma,
    mockConvertUnit,
    mockFindFulfillingIngredient,
    mockGetDerivableAmount,
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
        },
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

describe('CocktailRepository.findMakeable', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockIngredient.findMany.mockResolvedValue([])
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
