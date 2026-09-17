import { BaseService } from './base.service'
import { prisma } from '@/lib/db/prisma'
import { BaseRepository, toDelegate, type RepositoryConfig } from '@/repositories/base.repository'
import { NotFoundError } from '@/utils/errors'
import type { Glass, Prisma } from '@prisma/client'

class GlassRepository extends BaseRepository<
    Glass,
    Prisma.GlassCreateInput,
    Prisma.GlassUpdateInput
> {
    protected get model() {
        return toDelegate(prisma.glass)
    }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'glass',
            allowedSortFields: ['name'],
            allowedFilters:    [],
            allowedIncludes:   ['cocktails'],
            searchFields:      ['name', 'description'],
            defaultSortField:  'name',
            softDelete:        false,
        }
    }
}

const glassRepository = new GlassRepository()

const GLASS_FULL_DETAILS_SELECT = {
    id:          true,
    name:        true,
    imageUrl:    true,
    description: true,
    _count:      { select: { cocktails: true } },
} as const

export class GlassService extends BaseService<Glass, Prisma.GlassCreateInput, Prisma.GlassUpdateInput> {
    protected get repository() { return glassRepository }
    protected get entityName()  { return 'Glass' }
    protected get deleteStrategy() { return 'hard' as const }

    override async getById(id: string) {
        const glass = await prisma.glass.findUnique({
            where: { id },
            select: GLASS_FULL_DETAILS_SELECT,
        })
        if (!glass) throw new NotFoundError('Glass not found')
        return glass
    }
}

export const glassService = new GlassService()
