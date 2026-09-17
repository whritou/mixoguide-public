import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import { QueryBuilder } from '@/lib/query/QueryBuilder'
import type { PlannedCollection, Prisma, Occasion, RsvpStatus } from '@prisma/client'
import type { QueryParams, PaginatedResult } from '@/lib/query/types'

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

class PlannedCollectionRepository extends BaseRepository<
    PlannedCollection,
    Prisma.PlannedCollectionUncheckedCreateInput,
    Prisma.PlannedCollectionUncheckedUpdateInput
> {
    protected get model() { return toDelegate(prisma.plannedCollection) }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'plannedCollection',
            allowedSortFields: ['plannedFor', 'createdAt', 'status', 'completedAt'],
            allowedFilters:    ['userId', 'status', 'plannedFor'],
            allowedIncludes:   ['cocktails', 'user'],
            searchFields:      [],
            defaultSortField:  'plannedFor',
        }
    }

    /**
     * Override findMany to always include cocktails with nested ingredient data,
     * while still honoring pagination/filter/sort query params.
     */
    async findMany(params: QueryParams = {}): Promise<PaginatedResult<PlannedCollection>> {
        const { skip, take, page, limit, orderBy, where } =
            QueryBuilder.build(params, this.config)

        const baseWhere = { ...where, ...(params.extraWhere ?? {}) }
        const includeUser = Array.isArray(params.include) && params.include.includes('user')

        const [rawData, total] = await Promise.all([
            prisma.plannedCollection.findMany({
                where: baseWhere,
                orderBy,
                skip,
                take,
                include: {
                    cocktails: {
                        include: { cocktail: { select: COCKTAIL_WITH_INGREDIENTS } },
                    },
                    _count: { select: { rsvps: { where: { status: 'going' } } } },
                    ...(includeUser ? { user: true } : {}),
                },
            }),
            prisma.plannedCollection.count({ where: baseWhere }),
        ])

        const data = rawData.map(({ _count, ...item }) => ({
            ...item,
            rsvpGoingCount: _count.rsvps,
        }))

        return QueryBuilder.buildPaginatedResult(data, total, page, limit)
    }

    async findWithCocktails(id: string) {
        return prisma.plannedCollection.findUnique({
            where: { id },
            include: {
                cocktails: {
                    include: { cocktail: { select: COCKTAIL_WITH_INGREDIENTS } },
                },
            },
        })
    }

    async createWithCocktails(userId: string, data: {
        title: string
        location?: string | null
        guestNote?: string | null
        plannedFor: Date
        servings?: number
        occasions?: string[]
        cocktailIds?: string[]
    }) {
        const collection = await prisma.plannedCollection.create({
            data: {
                userId,
                title:      data.title,
                location:   data.location?.trim() || null,
                guestNote:  data.guestNote?.trim() || null,
                plannedFor: data.plannedFor,
                servings:   data.servings ?? 1,
                occasions:  (data.occasions ?? []) as Occasion[],
                status:     'planned',
            },
        })

        if (data.cocktailIds?.length) {
            await prisma.plannedCollectionCocktail.createMany({
                data: data.cocktailIds.map(cocktailId => ({
                    plannedCollectionId: collection.id,
                    cocktailId,
                })),
                skipDuplicates: true,
            })
        }

        return this.findWithCocktails(collection.id)
    }

    async addCocktail(plannedCollectionId: string, cocktailId: string) {
        return prisma.plannedCollectionCocktail.create({
            data: { plannedCollectionId, cocktailId },
        })
    }

    async removeCocktail(plannedCollectionId: string, cocktailId: string) {
        return prisma.plannedCollectionCocktail.deleteMany({
            where: { plannedCollectionId, cocktailId },
        })
    }

    async completeCocktail(plannedCollectionId: string, cocktailId: string, completedAt: Date) {
        return prisma.plannedCollectionCocktail.updateMany({
            where: { plannedCollectionId, cocktailId, status: 'planned' },
            data:  { status: 'done', completedAt },
        })
    }

    async completeAllCocktails(plannedCollectionId: string, completedAt: Date) {
        return prisma.plannedCollectionCocktail.updateMany({
            where: { plannedCollectionId, status: 'planned' },
            data:  { status: 'done', completedAt },
        })
    }

    async hasPlannedCocktails(plannedCollectionId: string) {
        const count = await prisma.plannedCollectionCocktail.count({
            where: { plannedCollectionId, status: 'planned' },
        })
        return count > 0
    }

    async hasCocktail(plannedCollectionId: string, cocktailId: string) {
        const count = await prisma.plannedCollectionCocktail.count({
            where: { plannedCollectionId, cocktailId },
        })
        return count > 0
    }

    async setShareToken(id: string, token: string | null, enabled: boolean) {
        return prisma.plannedCollection.update({
            where: { id },
            data: { shareToken: token, shareEnabled: enabled },
        })
    }

    async findByShareToken(token: string) {
        return prisma.plannedCollection.findUnique({
            where: { shareToken: token },
            include: {
                user: { select: { name: true } },
                cocktails: {
                    include: { cocktail: { select: COCKTAIL_WITH_INGREDIENTS } },
                },
                rsvps: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        })
    }

    async createRsvp(data: {
        collectionId: string
        name: string
        status: RsvpStatus
        guestCount: number
        note?: string | null
        email?: string | null
        userId?: string | null
    }) {
        if (data.userId) {
            const existing = await prisma.collectionRsvp.findFirst({
                where: { collectionId: data.collectionId, userId: data.userId },
            })
            if (existing) {
                return prisma.collectionRsvp.update({
                    where: { id: existing.id },
                    data: {
                        status:     data.status,
                        guestCount: data.guestCount,
                        note:       data.note ?? null,
                        email:      data.email ?? null,
                        name:       data.name,
                    },
                })
            }
        }
        return prisma.collectionRsvp.create({ data })
    }

    async getMyRsvps(userId: string) {
        return prisma.collectionRsvp.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                collection: {
                    select: {
                        id: true,
                        userId: true,
                        title: true,
                        location: true,
                        guestNote: true,
                        plannedFor: true,
                        shareToken: true,
                        shareEnabled: true,
                        user: { select: { id: true, name: true } },
                    },
                },
            },
        })
    }

    async getRsvps(collectionId: string) {
        return prisma.collectionRsvp.findMany({
            where: { collectionId },
            orderBy: { createdAt: 'asc' },
        })
    }
}

export const plannedCollectionRepository = new PlannedCollectionRepository()
