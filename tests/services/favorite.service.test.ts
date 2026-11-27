/**
 * Favorite service tests — repository is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError } from '@/utils/errors'
import { Prisma } from '@prisma/client'

const { mockFavoriteRepo } = vi.hoisted(() => ({
    mockFavoriteRepo: {
        findAllByUser:          vi.fn(),
        findByUserAndCocktail:  vi.fn(),
        addIdempotent:          vi.fn(),
        removeByUserAndCocktail: vi.fn(),
    },
}))

vi.mock('@/repositories/favorite.repository', () => ({ favoriteRepository: mockFavoriteRepo }))

import { favoriteService } from '@/services/favorite.service'

const UID        = 'user-1'
const COCKTAIL_ID = 'cocktail-martini'
const FAV_ID      = 'fav-1'

// ════════════════════════════════════════════════════════════════════════════
describe('FavoriteService.getByUser', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns a list of cocktailIds for the user', async () => {
        mockFavoriteRepo.findAllByUser.mockResolvedValue([
            { cocktailId: 'c-1' },
            { cocktailId: 'c-2' },
        ])

        const result = await favoriteService.getByUser(UID)

        expect(mockFavoriteRepo.findAllByUser).toHaveBeenCalledWith(UID)
        expect(result).toEqual(['c-1', 'c-2'])
    })

    it('returns an empty array when user has no favorites', async () => {
        mockFavoriteRepo.findAllByUser.mockResolvedValue([])
        const result = await favoriteService.getByUser(UID)
        expect(result).toEqual([])
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('FavoriteService.exists', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns true when the favorite exists', async () => {
        mockFavoriteRepo.findByUserAndCocktail.mockResolvedValue({ id: FAV_ID })
        await expect(favoriteService.exists(UID, COCKTAIL_ID)).resolves.toBe(true)
    })

    it('returns false when the favorite does not exist', async () => {
        mockFavoriteRepo.findByUserAndCocktail.mockResolvedValue(null)
        await expect(favoriteService.exists(UID, COCKTAIL_ID)).resolves.toBe(false)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('FavoriteService.add', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('adds the favorite through an idempotent upsert', async () => {
        const created = { userId: UID, cocktailId: COCKTAIL_ID }
        mockFavoriteRepo.addIdempotent.mockResolvedValue(created)

        const result = await favoriteService.add(UID, COCKTAIL_ID)

        expect(mockFavoriteRepo.addIdempotent).toHaveBeenCalledWith(UID, COCKTAIL_ID)
        expect(result).toBe(created)
    })

    it('is idempotent: adding an existing favorite returns it instead of failing', async () => {
        const existing = { id: FAV_ID, userId: UID, cocktailId: COCKTAIL_ID }
        mockFavoriteRepo.addIdempotent.mockResolvedValue(existing)

        await expect(favoriteService.add(UID, COCKTAIL_ID)).resolves.toBe(existing)
        await expect(favoriteService.add(UID, COCKTAIL_ID)).resolves.toBe(existing)
    })

    it('maps a missing cocktail (FK violation P2003) to NotFoundError', async () => {
        mockFavoriteRepo.addIdempotent.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'test' }),
        )

        await expect(favoriteService.add(UID, COCKTAIL_ID)).rejects.toThrow(NotFoundError)
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('FavoriteService.remove', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('deletes the favorite when it exists', async () => {
        mockFavoriteRepo.removeByUserAndCocktail.mockResolvedValue(1)

        await expect(favoriteService.remove(UID, COCKTAIL_ID)).resolves.not.toThrow()
        expect(mockFavoriteRepo.removeByUserAndCocktail).toHaveBeenCalledWith(UID, COCKTAIL_ID)
    })

    it('throws NotFoundError when the favorite does not exist', async () => {
        mockFavoriteRepo.removeByUserAndCocktail.mockResolvedValue(0)

        await expect(favoriteService.remove(UID, COCKTAIL_ID)).rejects.toThrow(NotFoundError)
    })
})
