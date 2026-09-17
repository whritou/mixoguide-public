import { prisma } from '@/lib/db/prisma'

class AdminStatsRepository {
    async getCounts() {
        const [
            cocktails,
            ingredients,
            users,
            ratings,
            plannedCocktails,
            completedCocktails,
            glasses,
            barTools,
        ] = await Promise.all([
            prisma.cocktail.count(),
            prisma.ingredient.count(),
            prisma.user.count(),
            prisma.rating.count(),
            prisma.plannedCocktail.count({ where: { status: 'planned' } }),
            prisma.plannedCocktail.count({ where: { status: 'done' } }),
            prisma.glass.count(),
            prisma.barTool.count(),
        ])

        return {
            cocktails,
            ingredients,
            users,
            ratings,
            plannedCocktails,
            completedCocktails,
            glasses,
            barTools,
        }
    }

    async getAlcoholDistribution() {
        const result = await prisma.cocktail.groupBy({
            by: ['isAlcoholic'],
            _count: { _all: true },
        })

        const counts = { alcoholic: 0, nonAlcoholic: 0 }

        for (const row of result) {
            if (row.isAlcoholic) counts.alcoholic = row._count._all
            else counts.nonAlcoholic = row._count._all
        }

        return counts
    }

    async getDifficultyDistribution() {
        const result = await prisma.cocktail.groupBy({
            by: ['difficulty'],
            _count: { _all: true },
        })

        return result.map((r) => ({
            difficulty: r.difficulty ?? 'unknown',
            count: r._count._all,
        }))
    }

    async getTechniqueDistribution() {
        const cocktails = await prisma.cocktail.findMany({
            select: { technique: true },
        })

        const techMap = new Map<string, number>()

        for (const c of cocktails) {
            for (const t of c.technique) {
                techMap.set(t, (techMap.get(t) ?? 0) + 1)
            }
        }

        return Array.from(techMap.entries())
            .map(([technique, count]) => ({ technique, count }))
            .sort((a, b) => b.count - a.count)
    }

    async getTopIngredients(limit = 10) {
        const result = await prisma.cocktailIngredient.groupBy({
            by: ['ingredientId'],
            _count: { _all: true },
            orderBy: { _count: { ingredientId: 'desc' } },
            take: limit,
        })

        const ingredientIds = result.map((r) => r.ingredientId)

        const ingredients = await prisma.ingredient.findMany({
            where: { id: { in: ingredientIds } },
            select: { id: true, name: true },
        })

        const nameMap = new Map(ingredients.map((i) => [i.id, i.name]))

        return result.map((r) => ({
            name: nameMap.get(r.ingredientId) ?? 'Unknown',
            count: r._count._all,
        }))
    }

    async getRatingsDistribution() {
        const result = await prisma.rating.groupBy({
            by: ['rating'],
            _count: { _all: true },
            orderBy: { rating: 'asc' },
        })

        return [1, 2, 3, 4, 5].map((rating) => ({
            rating,
            count: result.find((r) => r.rating === rating)?._count._all ?? 0,
        }))
    }

    async getBestRated(limit = 10) {
        const cocktails = await prisma.cocktail.findMany({
            where: { ratingCount: { gte: 1 } },
            orderBy: [{ avgRating: 'desc' }, { ratingCount: 'desc' }],
            take: limit,
            select: { name: true, avgRating: true, ratingCount: true },
        })

        return cocktails.map((c) => ({
            name: c.name,
            avgRating: c.avgRating ?? 0,
            ratingCount: c.ratingCount ?? 0,
        }))
    }

    async getRecentCompletions(limit = 50) {
        const completions = await prisma.plannedCocktail.findMany({
            where: { status: 'done', completedAt: { not: null } },
            orderBy: { completedAt: 'desc' },
            take: limit,
            select: {
                completedAt: true,
                cocktail: { select: { name: true } },
                user: { select: { name: true } },
            },
        })

        return completions.map((c) => ({
            cocktailName: c.cocktail.name,
            userName: c.user.name ?? 'Unknown',
            completedAt: c.completedAt!,
        }))
    }
}

export const adminStatsRepository = new AdminStatsRepository()
