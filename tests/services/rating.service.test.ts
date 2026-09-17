/**
 * Rating service tests — repository is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, ValidationError } from '@/utils/errors'

const { mockRatingRepo } = vi.hoisted(() => ({
    mockRatingRepo: {
        findMany:              vi.fn(),
        findForCocktail:       vi.fn(),
        getStatsForCocktail:   vi.fn(),
        findByUserAndCocktail: vi.fn(),
        upsert:                vi.fn(),
        hardDelete:            vi.fn(),
    },
}))

vi.mock('@/repositories/rating.repository', () => ({ ratingRepository: mockRatingRepo }))

import { ratingService } from '@/services/rating.service'

const UID        = 'user-1'
const COCKTAIL_ID = 'cocktail-martini'
const RATING_ID   = 'rating-1'

// ════════════════════════════════════════════════════════════════════════════
describe('RatingService.getByCocktail', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('delegates to ratingRepository.findForCocktail', async () => {
        const ratings = [{ id: RATING_ID, rating: 4 }]
        mockRatingRepo.findForCocktail.mockResolvedValue(ratings)

        const result = await ratingService.getByCocktail(COCKTAIL_ID)
        expect(mockRatingRepo.findForCocktail).toHaveBeenCalledWith(COCKTAIL_ID)
        expect(result).toBe(ratings)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('RatingService.getStats', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('delegates to ratingRepository.getStatsForCocktail', async () => {
        const stats = { average: 4.2, count: 15 }
        mockRatingRepo.getStatsForCocktail.mockResolvedValue(stats)

        const result = await ratingService.getStats(COCKTAIL_ID)
        expect(mockRatingRepo.getStatsForCocktail).toHaveBeenCalledWith(COCKTAIL_ID)
        expect(result).toBe(stats)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('RatingService.upsert', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('throws ValidationError when rating is below 1', async () => {
        await expect(
            ratingService.upsert(UID, COCKTAIL_ID, { rating: 0 })
        ).rejects.toThrow(ValidationError)
        expect(mockRatingRepo.upsert).not.toHaveBeenCalled()
    })

    it('throws ValidationError when rating is above 5', async () => {
        await expect(
            ratingService.upsert(UID, COCKTAIL_ID, { rating: 6 })
        ).rejects.toThrow(ValidationError)
        expect(mockRatingRepo.upsert).not.toHaveBeenCalled()
    })

    it('accepts valid boundary values (1 and 5)', async () => {
        const saved = { id: RATING_ID, rating: 1 }
        mockRatingRepo.upsert.mockResolvedValue(saved)

        await expect(ratingService.upsert(UID, COCKTAIL_ID, { rating: 1 })).resolves.toBe(saved)
        await expect(ratingService.upsert(UID, COCKTAIL_ID, { rating: 5 })).resolves.toBeDefined()
    })

    it('calls repository.upsert with the correct identifiers and data', async () => {
        const saved = { id: RATING_ID, rating: 4 }
        mockRatingRepo.upsert.mockResolvedValue(saved)

        const result = await ratingService.upsert(UID, COCKTAIL_ID, { rating: 4 })

        expect(mockRatingRepo.upsert).toHaveBeenCalledWith(
            { userId_cocktailId: { userId: UID, cocktailId: COCKTAIL_ID } },
            expect.objectContaining({ userId: UID, cocktailId: COCKTAIL_ID, rating: 4 }),
            expect.objectContaining({ rating: 4 })
        )
        expect(result).toBe(saved)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('RatingService.delete', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('throws NotFoundError when the rating does not exist', async () => {
        mockRatingRepo.findByUserAndCocktail.mockResolvedValue(null)

        await expect(ratingService.delete(UID, COCKTAIL_ID)).rejects.toThrow(NotFoundError)
        expect(mockRatingRepo.hardDelete).not.toHaveBeenCalled()
    })

    it('deletes the rating when found', async () => {
        mockRatingRepo.findByUserAndCocktail.mockResolvedValue({ id: RATING_ID })
        mockRatingRepo.hardDelete.mockResolvedValue(true)

        await expect(ratingService.delete(UID, COCKTAIL_ID)).resolves.not.toThrow()
        expect(mockRatingRepo.hardDelete).toHaveBeenCalledWith(RATING_ID)
    })

    it('throws NotFoundError when hardDelete fails unexpectedly', async () => {
        mockRatingRepo.findByUserAndCocktail.mockResolvedValue({ id: RATING_ID })
        mockRatingRepo.hardDelete.mockResolvedValue(false)

        await expect(ratingService.delete(UID, COCKTAIL_ID)).rejects.toThrow(NotFoundError)
    })
})
