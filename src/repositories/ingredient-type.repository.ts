import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import type { IngredientType, Prisma } from '@prisma/client'

class IngredientTypeRepository extends BaseRepository <
IngredientType,
    Prisma.IngredientTypeCreateInput,
Prisma.IngredientTypeUpdateInput
> {
    protected get model() {
        return toDelegate(prisma.ingredientType)
    }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'ingredientType',
            allowedSortFields: ['name', 'createdAt'],
            allowedFilters:    [],
            allowedIncludes:   ['subTypes'],
            searchFields:      ['name'],
            defaultSortField:  'name',
            softDelete:        false,
        }
    }

    static readonly defaultSelect = {
        id: true,
        name: true,
        createdAt: true,
    }

    async findByName(name: string) {
        return prisma.ingredientType.findUnique({ where: { name } })
    }

    async findWithSubTypes(id: string) {
        return prisma.ingredientType.findUnique({
            where: { id },
            select: {
                ...IngredientTypeRepository.defaultSelect,
                subTypes: {
                    select: { id: true, name: true, typeId: true },
                    orderBy: { name: 'asc' },
                },
                _count: {
                    select: { subTypes: true, ingredients: true },
                },
            },
        })
    }
}

export const ingredientTypeRepository = new IngredientTypeRepository()