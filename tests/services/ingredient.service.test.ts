/**
 * Ingredient service tests. Prisma is mocked because the thin repository lives inside the service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { NotFoundError } from '@/utils/errors'

const { mockPrisma } = vi.hoisted(() => ({
    mockPrisma: {
        ingredient: {
            findMany:   vi.fn(),
            count:      vi.fn(),
            findUnique: vi.fn(),
            create:     vi.fn(),
            update:     vi.fn(),
            delete:     vi.fn(),
        },
    },
}))

vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma }))

import { ingredientService } from '@/services/ingredient.service'

const ING_ID = 'ing-gin'

function prismaNotFound() {
    return new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
    })
}

describe('IngredientService.findIdsByNames', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('maps requested names to ids case-insensitively and omits unknown names', async () => {
        mockPrisma.ingredient.findMany.mockResolvedValue([
            { id: 'ing-rye', name: 'Rye Whiskey' },
            { id: 'ing-gin', name: 'Gin' },
        ])

        const result = await ingredientService.findIdsByNames(['Rye whiskey', 'Gin', 'Unobtainium'])

        expect(result).toEqual({ 'Rye whiskey': 'ing-rye', Gin: 'ing-gin' })
        expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
            where: { name: { in: ['Rye whiskey', 'Gin', 'Unobtainium'], mode: 'insensitive' } },
            select: { id: true, name: true },
        })
    })

    it('skips the query for an empty list', async () => {
        await expect(ingredientService.findIdsByNames([])).resolves.toEqual({})
        expect(mockPrisma.ingredient.findMany).not.toHaveBeenCalled()
    })
})

describe('IngredientService.getAll', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('queries ingredients with QueryBuilder pagination and returns metadata', async () => {
        const data = [{ id: ING_ID, name: 'Gin' }]
        mockPrisma.ingredient.findMany.mockResolvedValue(data)
        mockPrisma.ingredient.count.mockResolvedValue(1)

        const result = await ingredientService.getAll({ page: 1, limit: 20 })

        // Default sort is usageCount desc (relation-count) with name asc tiebreak.
        // Every list response also ships _count.cocktailIngredients so cards
        // can render "Used in N cocktails" without a follow-up query.
        expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {},
            orderBy: [
                { cocktailIngredients: { _count: 'desc' } },
                { name: 'asc' },
            ],
            skip: 0,
            take: 20,
            include: { _count: { select: { cocktailIngredients: true } } },
        }))
        expect(mockPrisma.ingredient.count).toHaveBeenCalledWith({ where: {} })
        expect(result.data).toBe(data)
        expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 })
    })
})

describe('IngredientService.getById', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns the ingredient when found', async () => {
        const ingredient = { id: ING_ID, name: 'Gin' }
        mockPrisma.ingredient.findUnique.mockResolvedValue(ingredient)

        await expect(ingredientService.getById(ING_ID)).resolves.toBe(ingredient)
        // Detail select ships _count for the usage badge but no longer the
        // full cocktailIngredients array (which the UI never rendered).
        expect(mockPrisma.ingredient.findUnique).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: ING_ID },
            select: expect.objectContaining({
                _count: { select: { cocktailIngredients: true } },
            }),
        }))
        const findUniqueArgs = mockPrisma.ingredient.findUnique.mock.calls[0]?.[0] as { select?: Record<string, unknown> }
        expect(findUniqueArgs.select).not.toHaveProperty('cocktailIngredients')
    })

    it('throws NotFoundError when ingredient does not exist', async () => {
        mockPrisma.ingredient.findUnique.mockResolvedValue(null)
        await expect(ingredientService.getById('nope')).rejects.toThrow(NotFoundError)
    })
})

describe('IngredientService.create', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('creates the ingredient and returns the result', async () => {
        const input = { name: 'Vodka', isAlcoholic: true, unit: 'cl' } as any
        const created = { id: ING_ID, ...input }
        mockPrisma.ingredient.create.mockResolvedValue(created)

        const result = await ingredientService.create(input)

        expect(mockPrisma.ingredient.create).toHaveBeenCalledWith({ data: input })
        expect(result).toBe(created)
    })
})

describe('IngredientService.update', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns the updated ingredient on success', async () => {
        const input = { name: 'Premium Gin' } as any
        const updated = { id: ING_ID, name: 'Premium Gin' }
        mockPrisma.ingredient.update.mockResolvedValue(updated)

        const result = await ingredientService.update(ING_ID, input)

        expect(result).toBe(updated)
        expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({ where: { id: ING_ID }, data: input })
    })

    it('throws NotFoundError when ingredient does not exist', async () => {
        mockPrisma.ingredient.update.mockRejectedValue(prismaNotFound())

        await expect(
            ingredientService.update('nope', { name: 'X' } as any)
        ).rejects.toThrow(NotFoundError)
    })
})

describe('IngredientService.delete', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('resolves without error when ingredient is deleted', async () => {
        mockPrisma.ingredient.delete.mockResolvedValue({ id: ING_ID })
        await expect(ingredientService.delete(ING_ID)).resolves.not.toThrow()
    })

    it('throws NotFoundError when ingredient does not exist', async () => {
        mockPrisma.ingredient.delete.mockRejectedValue(prismaNotFound())
        await expect(ingredientService.delete('nope')).rejects.toThrow(NotFoundError)
    })
})
