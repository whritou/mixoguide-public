import { BaseService } from './base.service'
import { barToolRepository } from '@/repositories/bartool.repository'
import { ConflictError, NotFoundError } from '@/utils/errors'
import type { BarTool, Prisma } from '@prisma/client'

export class BarToolService extends BaseService<BarTool, Prisma.BarToolCreateInput, Prisma.BarToolUpdateInput> {
    protected get repository() { return barToolRepository }
    protected get entityName()  { return 'Bar tool' }
    protected get deleteStrategy() { return 'hard' as const }

    // Override getById to use the richer findWithFullDetails
    override async getById(id: string) {
        const barTool = await barToolRepository.findWithFullDetails(id)
        if (!barTool) throw new NotFoundError('Bar tool not found')
        return barTool
    }

    // Override create to enforce name uniqueness
    override async create(data: Prisma.BarToolCreateInput) {
        const existing = await barToolRepository.findByName(data.name)
        if (existing) throw new ConflictError('Bar tool already exists')
        return barToolRepository.create(data)
    }

    // Override update to enforce name uniqueness
    override async update(id: string, data: Prisma.BarToolUpdateInput) {
        if (typeof data.name === 'string') {
            const existing = await barToolRepository.findByName(data.name)
            if (existing && existing.id !== id) throw new ConflictError('Name already taken')
        }
        return super.update(id, data)
    }

    // Domain-specific read methods
    getEssential() {
        return barToolRepository.findEssential()
    }

    getByType(type: Prisma.BarToolWhereInput['type']) {
        return barToolRepository.findByType(type)
    }
}

export const barToolService = new BarToolService()
