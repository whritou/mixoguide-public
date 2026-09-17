/**
 * Favorite service tests — repository is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, ConflictError } from '@/utils/errors'

const { mockFavoriteRepo } = vi.hoisted(() => ({
    mockFavoriteRepo: {
        findAllByUser:          vi.fn(),
        findByUserAndCocktail:  vi.fn(),
        create:                 vi.fn(),
        hardDelete:             vi.fn(),
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

    it('creates the favorite when it does not already exist', async () => {
        mockFavoriteRepo.findByUserAndCocktail.mockResolvedValue(null)
        const created = { userId: UID, cocktailId: COCKTAIL_ID }
        mockFavoriteRepo.create.mockResolvedValue(created)

        const result = await favoriteService.add(UID, COCKTAIL_ID)

        expect(mockFavoriteRepo.create).toHaveBeenCalledWith({ userId: UID, cocktailId: COCKTAIL_ID })
        expect(result).toBe(created)
    })

    it('throws ConflictError when the cocktail is already in favorites', async () => {
        mockFavoriteRepo.findByUserAndCocktail.mockResolvedValue({ id: FAV_ID })

        await expect(favoriteService.add(UID, COCKTAIL_ID)).rejects.toThrow(ConflictError)
        expect(mockFavoriteRepo.create).not.toHaveBeenCalled()
    })
})

// ════════════════════════════════════════════════════════════════════════════
describe('FavoriteService.remove', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('deletes the favorite when it exists', async () => {
        mockFavoriteRepo.findByUserAndCocktail.mockResolvedValue({ id: FAV_ID })
        mockFavoriteRepo.hardDelete.mockResolvedValue(true)

        await expect(favoriteService.remove(UID, COCKTAIL_ID)).resolves.not.toThrow()
        expect(mockFavoriteRepo.hardDelete).toHaveBeenCalledWith(FAV_ID)
    })

    it('throws NotFoundError when the favorite does not exist', async () => {
        mockFavoriteRepo.findByUserAndCocktail.mockResolvedValue(null)

        await expect(favoriteService.remove(UID, COCKTAIL_ID)).rejects.toThrow(NotFoundError)
        expect(mockFavoriteRepo.hardDelete).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when hardDelete fails unexpectedly', async () => {
        mockFavoriteRepo.findByUserAndCocktail.mockResolvedValue({ id: FAV_ID })
        mockFavoriteRepo.hardDelete.mockResolvedValue(false)

        await expect(favoriteService.remove(UID, COCKTAIL_ID)).rejects.toThrow(NotFoundError)
    })
})
