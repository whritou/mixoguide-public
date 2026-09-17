import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockIngredientSubType, mockPrisma } = vi.hoisted(() => {
    const mockIngredientSubType = {
        count:      vi.fn(),
        findFirst: vi.fn(),
        findMany:  vi.fn(),
        findUnique: vi.fn(),
    }

    return {
        mockIngredientSubType,
        mockPrisma: {
            ingredientSubType: mockIngredientSubType,
        },
    }
})

vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma }))

import { ingredientSubTypeRepository } from '@/repositories/ingredient-subtype.repository'

describe('IngredientSubTypeRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('loads details without selecting non-existent timestamp columns', async () => {
        mockIngredientSubType.findUnique.mockResolvedValue({
            id:     'sub-1',
            name:   'Citrus',
            typeId: 'type-1',
        })

        await ingredientSubTypeRepository.findWithDetails('sub-1')

        expect(mockIngredientSubType.findUnique).toHaveBeenCalledWith({
            where: { id: 'sub-1' },
            select: {
                id:     true,
                name:   true,
                typeId: true,
                type: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { ingredients: true },
                },
            },
        })
    })

    it('does not allow sorting by createdAt because IngredientSubType has no createdAt field', async () => {
        mockIngredientSubType.findMany.mockResolvedValue([])
        mockIngredientSubType.count.mockResolvedValue(0)

        await ingredientSubTypeRepository.findMany({ sortBy: 'createdAt' })

        expect(mockIngredientSubType.findMany).toHaveBeenCalledWith(expect.objectContaining({
            orderBy: { name: 'asc' },
        }))
    })
})
