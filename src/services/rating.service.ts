import { ratingRepository } from '@/repositories/rating.repository'
import { NotFoundError, ValidationError } from '@/utils/errors'
import type { Prisma } from '@prisma/client'
import type { QueryParams } from '@/lib/query/types'

export class RatingService {
    async getAll(params: QueryParams) {
        return ratingRepository.findMany({ ...params, include: ['user'] })
    }

    async getByCocktail(cocktailId: string) {
        return ratingRepository.findForCocktail(cocktailId)
    }

    async getStats(cocktailId: string) {
        return ratingRepository.getStatsForCocktail(cocktailId)
    }

    async upsert(userId: string, cocktailId: string, data: { rating: number }) {
        if (data.rating < 1 || data.rating > 5) {
            throw new ValidationError('Rating must be between 1 and 5')
        }
        return ratingRepository.upsert(
            { userId_cocktailId: { userId, cocktailId } },
            { userId, cocktailId, ...data } as Prisma.RatingUncheckedCreateInput,
            data as Prisma.RatingUncheckedUpdateInput
        )
    }

    async delete(userId: string, cocktailId: string) {
        const existing = await ratingRepository.findByUserAndCocktail(userId, cocktailId)
        if (!existing) throw new NotFoundError('Rating not found')
        const ok = await ratingRepository.hardDelete(existing.id)
        if (!ok) throw new NotFoundError('Rating not found')
    }
}

export const ratingService = new RatingService()