import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import { QueryBuilder } from '@/lib/query/QueryBuilder'
import type { PlannedCocktail, Prisma } from '@prisma/client'
import type { QueryParams, PaginatedResult } from '@/lib/query/types'

/** Cocktail select with ingredients for planned cocktail cards */
const COCKTAIL_WITH_INGREDIENTS = {
    id: true, name: true, imageUrl: true, difficulty: true,
    ingredients: {
        select: {
            ingredientId: true, amount: true, unit: true, optional: true,
            ingredient: {
                select: {
                    id: true,
                    name: true,
                    isAlcoholic: true,
                    type: { select: { name: true } },
                    subType: { select: { name: true } },
                },
            },
        },
    },
} as const

class PlannedCocktailRepository extends BaseRepository<
    PlannedCocktail,
    Prisma.PlannedCocktailUncheckedCreateInput,
    Prisma.PlannedCocktailUncheckedUpdateInput
> {
    protected get model() { return toDelegate(prisma.plannedCocktail) }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'plannedCocktail',
            allowedSortFields: ['plannedFor', 'createdAt', 'status', 'completedAt'],
            allowedFilters:    ['userId', 'status', 'plannedFor'],
            allowedIncludes:   ['cocktail', 'user'],
            searchFields:      [],
            defaultSortField:  'plannedFor',
        }
    }

    /**
     * Override findMany to always include cocktail with ingredients
     * when cocktail is requested (the generic include path can't handle
     * the nested select for ingredient names).
     */
    async findMany(params: QueryParams = {}): Promise<PaginatedResult<PlannedCocktail>> {
        const { skip, take, page, limit, orderBy, where } =
            QueryBuilder.build(params, this.config)

        const baseWhere = { ...where, ...(params.extraWhere ?? {}) }

        const [data, total] = await Promise.all([
            prisma.plannedCocktail.findMany({
                where: baseWhere,
                orderBy,
                skip,
                take,
                include: { cocktail: { select: COCKTAIL_WITH_INGREDIENTS } },
            }),
            prisma.plannedCocktail.count({ where: baseWhere }),
        ])

        return QueryBuilder.buildPaginatedResult(data, total, page, limit)
    }

    /** Fetches a planned cocktail with its cocktail+ingredients for completion/shopping logic. */
    async findWithCocktailIngredients(id: string) {
        return prisma.plannedCocktail.findUnique({
            where: { id },
            include: {
                cocktail: { select: COCKTAIL_WITH_INGREDIENTS },
            },
        })
    }

    async upsertPlanned(data: Prisma.PlannedCocktailUncheckedCreateInput) {
        return prisma.plannedCocktail.upsert({
            where: {
                userId_cocktailId: {
                    userId: data.userId as string,
                    cocktailId: data.cocktailId as string,
                },
            },
            update: {
                status: 'planned',
                plannedFor: data.plannedFor as Date,
                quantity: data.quantity ?? 1,
                completedAt: null,
            },
            create: { ...data, status: 'planned' } as Prisma.PlannedCocktailUncheckedCreateInput,
        })
    }

    async upsertAsMade(userId: string, cocktailId: string, quantity: number, madeAt: Date) {
        return prisma.plannedCocktail.upsert({
            where: { userId_cocktailId: { userId, cocktailId } },
            update: { quantity, status: 'done', completedAt: madeAt, plannedFor: madeAt },
            create: { userId, cocktailId, quantity, plannedFor: madeAt, status: 'done', completedAt: madeAt },
        })
    }

    /**
     * User-scoped lookup. The userId should be the authenticated session user id,
     * so callers cannot infer another user's planning state for a cocktail.
     */
    async findByUserAndCocktail(userId: string, cocktailId: string) {
        return prisma.plannedCocktail.findFirst({
            where:  { userId, cocktailId },
            select: { id: true, status: true, plannedFor: true, quantity: true },
        })
    }
}

export const plannedCocktailRepository = new PlannedCocktailRepository()
