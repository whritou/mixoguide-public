import { cocktailMadeLogRepository } from '@/repositories/cocktail-made-log.repository'
import { ForbiddenError, NotFoundError } from '@/utils/errors'
import type { Prisma } from '@prisma/client'

type CreateCocktailMadeLogInput = {
    userId: string
    cocktailId: string
    quantity: number
    madeAt?: Date
    note?: string
}

class CocktailMadeLogService {
    async getByUser(userId: string, page = 1, limit = 50, includeArchived = false) {
        return cocktailMadeLogRepository.findByUser(userId, page, limit, includeArchived)
    }

    async create(data: CreateCocktailMadeLogInput, tx?: Prisma.TransactionClient) {
        return cocktailMadeLogRepository.create(data, tx)
    }

    async delete(id: string, userId: string, isAdmin: boolean) {
        const log = await cocktailMadeLogRepository.findOwnershipById(id)
        if (!log) throw new NotFoundError('Log entry not found')

        if (!isAdmin && log.userId !== userId) {
            throw new ForbiddenError('You can only delete your own history entries')
        }

        const ok = await cocktailMadeLogRepository.archiveById(id)
        if (!ok) throw new NotFoundError('Log entry not found')
    }
}

export const cocktailMadeLogService = new CocktailMadeLogService()
