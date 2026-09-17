import { favoriteRepository } from '@/repositories/favorite.repository'
import { NotFoundError, ConflictError } from '@/utils/errors'

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

    async add(userId: string, cocktailId: string) {
        const existing = await favoriteRepository.findByUserAndCocktail(userId, cocktailId)
        if (existing) throw new ConflictError('Cocktail already in favorites')
        return favoriteRepository.create({ userId, cocktailId })
    }

    async remove(userId: string, cocktailId: string) {
        const existing = await favoriteRepository.findByUserAndCocktail(userId, cocktailId)
        if (!existing) throw new NotFoundError('Favorite not found')
        const ok = await favoriteRepository.hardDelete(existing.id)
        if (!ok) throw new NotFoundError('Favorite not found')
    }
}

export const favoriteService = new FavoriteService()