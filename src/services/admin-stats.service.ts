import { adminStatsRepository } from '@/repositories/admin-stats.repository'

export type AdminDashboardStats = {
    counts: {
        cocktails: number
        ingredients: number
        users: number
        ratings: number
        plannedCocktails: number
        completedCocktails: number
        glasses: number
        barTools: number
    }
    alcoholDistribution: {
        alcoholic: number
        nonAlcoholic: number
    }
    difficultyDistribution: { difficulty: string; count: number }[]
    techniqueDistribution: { technique: string; count: number }[]
    topIngredients: { name: string; count: number }[]
    ratingsDistribution: { rating: number; count: number }[]
    bestRated: { name: string; avgRating: number; ratingCount: number }[]
    recentCompletions: {
        cocktailName: string
        userName: string
        completedAt: Date
    }[]
}

class AdminStatsService {
    async getDashboardStats(): Promise<AdminDashboardStats> {
        const [
            counts,
            alcoholDistribution,
            difficultyDistribution,
            techniqueDistribution,
            topIngredients,
            ratingsDistribution,
            bestRated,
            recentCompletions,
        ] = await Promise.all([
            adminStatsRepository.getCounts(),
            adminStatsRepository.getAlcoholDistribution(),
            adminStatsRepository.getDifficultyDistribution(),
            adminStatsRepository.getTechniqueDistribution(),
            adminStatsRepository.getTopIngredients(),
            adminStatsRepository.getRatingsDistribution(),
            adminStatsRepository.getBestRated(),
            adminStatsRepository.getRecentCompletions(),
        ])

        return {
            counts,
            alcoholDistribution,
            difficultyDistribution,
            techniqueDistribution,
            topIngredients,
            ratingsDistribution,
            bestRated,
            recentCompletions,
        }
    }
}

export const adminStatsService = new AdminStatsService()
