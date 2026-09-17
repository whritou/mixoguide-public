import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import type { IngredientSubType, Prisma } from '@prisma/client'

class IngredientSubTypeRepository extends BaseRepository<
    IngredientSubType,
    Prisma.IngredientSubTypeUncheckedCreateInput,
    Prisma.IngredientSubTypeUncheckedUpdateInput
> {
    protected get model() {
        return toDelegate(prisma.ingredientSubType)
    }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'ingredientSubType',
            allowedSortFields: ['name', 'typeId'],
            allowedFilters:    ['typeId'],
            allowedIncludes:   ['type', 'ingredients'],
            searchFields:      ['name'],
            defaultSortField:  'name',
            softDelete:        false,
        }
    }

    static readonly defaultSelect = {
        id:        true,
        name:      true,
        typeId:    true,
    }

    async findByNameAndType(name: string, typeId: string, excludeId?: string) {
        return prisma.ingredientSubType.findFirst({
            where: {
                name,
                typeId,
                ...(excludeId && { id: { not: excludeId } }),
            },
        })
    }

    async findWithDetails(id: string) {
        return prisma.ingredientSubType.findUnique({
            where: { id },
            select: {
                ...IngredientSubTypeRepository.defaultSelect,
                type: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { ingredients: true },
                },
            },
        })
    }
}

export const ingredientSubTypeRepository = new IngredientSubTypeRepository()
