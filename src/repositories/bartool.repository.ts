import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import type { BarTool, Prisma } from '@prisma/client'

class BarToolRepository extends BaseRepository <
    BarTool,
    Prisma.BarToolCreateInput,
    Prisma.BarToolUpdateInput
> {
    protected get model() {
        return toDelegate(prisma.barTool)
    }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'barTool',
            allowedSortFields: ['name', 'type'],
            allowedFilters:    ['type', 'isEssential'],
            allowedIncludes:   ['cocktails'],
            searchFields:      ['name', 'description'],
            defaultSortField:  'name',
            softDelete:        false,
        }
    }

    static readonly defaultSelect = {
        id:            true,
        name:          true,
        type:          true,
        isEssential:   true,
        imageUrl:      true,
    }

    static readonly fullSelect = {
        ...BarToolRepository.defaultSelect,
        description: true,
        _count: { select: { cocktails: true } },
    }

    async findByName(name: string) {
        return prisma.barTool.findUnique({ where: { name } })
    }

    async findWithFullDetails(id: string) {
        return prisma.barTool.findUnique({
            where: { id },
            select: {
                ...BarToolRepository.defaultSelect,
                description: true,
                cocktails: {
                    include: {
                        cocktail: {
                            select: { id: true, name: true, imageUrl: true, difficulty: true },
                        },
                    },
                },
                _count: { select: { cocktails: true } },
            },
        })
    }

    async findEssential() {
        return prisma.barTool.findMany({
            where:   { isEssential: true },
            select:  BarToolRepository.defaultSelect,
            orderBy: { name: 'asc' },
        })
    }

    async findByType(type: Prisma.BarToolWhereInput['type']) {
        return prisma.barTool.findMany({
            where:   { type },
            select:  BarToolRepository.defaultSelect,
            orderBy: { name: 'asc' },
        })
    }
}

export const barToolRepository = new BarToolRepository()