import { favoriteRepository } from '@/repositories/favorite.repository'
import { isPrismaErrorCode } from '@/lib/db/transaction'
import { NotFoundError } from '@/utils/errors'

export class FavoriteService {
    // Returns just cocktailIds for the frontend toggle state
    async getByUser(userId: string) {
        const rows = await favoriteRepository.findAllByUser(userId)
        return rows.map((r: { cocktailId: string }) => r.cocktailId)
    }

    async exists(userId: string, cocktailId: string) {
        const row = await favoriteRepository.findByUserAndCocktail(userId, cocktailId)
        return !!row
    }

    /**
     * Idempotent: adding an existing favorite returns the existing row
     * (no check-then-insert race, no 500 on double tap).
     */
    async add(userId: string, cocktailId: string) {
        try {
            return await favoriteRepository.addIdempotent(userId, cocktailId)
        } catch (err) {
            if (isPrismaErrorCode(err, 'P2003')) throw new NotFoundError('Cocktail not found')
            throw err
        }
    }

    async remove(userId: string, cocktailId: string) {
        const deleted = await favoriteRepository.removeByUserAndCocktail(userId, cocktailId)
        if (deleted === 0) throw new NotFoundError('Favorite not found')
    }
}

export const favoriteService = new FavoriteService()
