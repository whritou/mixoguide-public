import { cocktailRepository } from '@/repositories/cocktail.repository'
import { cocktailMadeLogRepository } from '@/repositories/cocktail-made-log.repository'
import { favoriteRepository } from '@/repositories/favorite.repository'
import { ratingRepository } from '@/repositories/rating.repository'
import { cocktailService } from './cocktail.service'

export interface RecommendedCocktail {
    id: string
    name: string
    imageUrl: string | null
    difficulty: string
    avgRating: number | null
    ratingCount: number
    preparationTime: number | null
    flavors: string[]
}

export interface Recommendations {
    neverTried: RecommendedCocktail[]
    drinkAgain: RecommendedCocktail[]
    similarToFavorites: RecommendedCocktail[]
}

class RecommendationService {
    async getRecommendations(userId: string): Promise<Recommendations> {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

        const [makeable, loggedIds, recentIds, highRatedIds, favorites] = await Promise.all([
            cocktailService.getMakeable(userId, 0),
            cocktailMadeLogRepository.findCocktailIdsByUser(userId).then((ids) => new Set(ids)),
            cocktailMadeLogRepository.findCocktailIdsByUser(userId, thirtyDaysAgo).then((ids) => new Set(ids)),
            ratingRepository.findHighRatedCocktailIdsByUser(userId, 4),
            favoriteRepository.findAllByUserWithCocktailProfile(userId),
        ])

        const neverTried: RecommendedCocktail[] = makeable
            .filter((c) => !loggedIds.has(c.id))
            .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
            .map((c) => ({
                id: c.id,
                name: c.name,
                imageUrl: c.imageUrl ?? null,
                difficulty: c.difficulty,
                avgRating: c.avgRating ?? null,
                ratingCount: c.ratingCount ?? 0,
                preparationTime: c.preparationTime ?? null,
                flavors: (c.flavors as string[]) ?? [],
            }))

        const drinkAgainIds = highRatedIds.filter((id) => !recentIds.has(id))
        const drinkAgainCocktails = drinkAgainIds.length > 0
            ? await cocktailRepository.findTopRatedByIds(drinkAgainIds, 6)
            : []

        const drinkAgain: RecommendedCocktail[] = drinkAgainCocktails.map((c) => ({
            ...c,
            avgRating: c.avgRating ?? null,
            flavors: c.flavors as string[],
        }))

        const favFlavorSet = new Set(favorites.flatMap((f) => f.cocktail.flavors as string[]))
        const favAlcoholList = favorites.map((f) => f.cocktail.mainAlcoholId).filter(Boolean) as string[]
        const favIds = new Set(favorites.map((f) => f.cocktailId))

        let similarToFavorites: RecommendedCocktail[] = []
        if (favFlavorSet.size > 0 || favAlcoholList.length > 0) {
            const rows = await cocktailRepository.findSimilarToFavorites(
                [...favIds],
                [...favFlavorSet],
                favAlcoholList,
                6,
            )
            similarToFavorites = rows.map((c) => ({
                ...c,
                avgRating: c.avgRating ?? null,
                flavors: c.flavors as string[],
            }))
        }

        return { neverTried, drinkAgain, similarToFavorites }
    }
}

export const recommendationService = new RecommendationService()
