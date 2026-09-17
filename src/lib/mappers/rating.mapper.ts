import { createMapper } from './createMapper'
import type { RatingDTO, Rating } from '@/types/models/rating'

export const [mapRating, mapRatings] = createMapper<RatingDTO, Rating>((dto, _n) => ({
    id:         dto.id,
    userId:     dto.userId,
    cocktailId: dto.cocktailId,
    rating:     dto.rating,
    createdAt:  dto.createdAt,

    user: dto.user
        ? {
            id:   dto.user.id,
            name: dto.user.name,
        }
        : undefined,

    cocktail: dto.cocktail
        ? {
            id:   dto.cocktail.id,
            name: dto.cocktail.name,
        }
        : undefined,
}))
