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

/** Upper bound on RSVPs loaded for a collection view. */
export const MAX_RSVPS_IN_VIEW = 500

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
                    ...(includeUser ? { user: { select: { id: true, name: true, image: true } } } : {}),
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
        // DB-008: single nested write — the collection and its cocktails are
        // created atomically (no empty collection left behind on failure).
        const cocktailIds = [...new Set(data.cocktailIds ?? [])]
        return prisma.plannedCollection.create({
            data: {
                userId,
                title:      data.title,
                location:   data.location?.trim() || null,
                guestNote:  data.guestNote?.trim() || null,
                plannedFor: data.plannedFor,
                servings:   data.servings ?? 1,
                occasions:  (data.occasions ?? []) as Occasion[],
                status:     'planned',
                ...(cocktailIds.length
                    ? { cocktails: { createMany: { data: cocktailIds.map(cocktailId => ({ cocktailId })), skipDuplicates: true } } }
                    : {}),
            },
            include: {
                cocktails: {
                    include: { cocktail: { select: COCKTAIL_WITH_INGREDIENTS } },
                },
            },
        })
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

    /** Claim one collection cocktail (`planned → done`). Returns the number of claimed rows (0 or 1). */
    async completeCocktail(
        plannedCollectionId: string,
        cocktailId: string,
        completedAt: Date,
        tx: Prisma.TransactionClient = prisma,
    ) {
        return tx.plannedCollectionCocktail.updateMany({
            where: { plannedCollectionId, cocktailId, status: 'planned' },
            data:  { status: 'done', completedAt },
        })
    }

    /**
     * Claim every still-planned cocktail of a collection and return the ids of
     * the rows THIS call flipped to done (so the caller deducts only for those).
     */
    async completeAllCocktails(
        plannedCollectionId: string,
        completedAt: Date,
        tx: Prisma.TransactionClient = prisma,
    ): Promise<string[]> {
        const rows = await tx.$queryRaw<Array<{ cocktailId: string }>>`
            UPDATE planned_collection_cocktails
               SET status = 'done', completed_at = ${completedAt}
             WHERE planned_collection_id = ${plannedCollectionId}
               AND status = 'planned'
         RETURNING cocktail_id AS "cocktailId"
        `
        return rows.map((r) => r.cocktailId)
    }

    /** Claim the collection itself (`planned → done`). Returns true when this caller won. */
    async claimCompletion(id: string, completedAt: Date, tx: Prisma.TransactionClient = prisma): Promise<boolean> {
        const result = await tx.plannedCollection.updateMany({
            where: { id, status: 'planned' },
            data:  { status: 'done', completedAt },
        })
        return result.count === 1
    }

    async hasPlannedCocktails(plannedCollectionId: string, tx: Prisma.TransactionClient = prisma) {
        const count = await tx.plannedCollectionCocktail.count({
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
                    take:    MAX_RSVPS_IN_VIEW,
                    select:  {
                        id: true, userId: true, name: true, email: true, status: true,
                        guestCount: true, note: true, createdAt: true,
                    },
                },
            },
        })
    }

    /** Minimal lookup used by the RSVP write path (no cocktails / RSVP list). */
    async findShareInfoByToken(token: string) {
        return prisma.plannedCollection.findUnique({
            where:  { shareToken: token },
            select: { id: true, shareEnabled: true },
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
        // DB-008: logged-in users have exactly one RSVP per collection, enforced
        // by the (collection_id, user_id) unique index — upsert is race-free.
        if (data.userId) {
            const fields = {
                status:     data.status,
                guestCount: data.guestCount,
                note:       data.note ?? null,
                email:      data.email ?? null,
                name:       data.name,
            }
            return prisma.collectionRsvp.upsert({
                where:  { collectionId_userId: { collectionId: data.collectionId, userId: data.userId } },
                update: fields,
                create: { ...fields, collectionId: data.collectionId, userId: data.userId },
            })
        }
        return prisma.collectionRsvp.create({ data: { ...data, userId: null } })
    }

    async countGuestRsvps(collectionId: string) {
        return prisma.collectionRsvp.count({ where: { collectionId, userId: null } })
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
            take: MAX_RSVPS_IN_VIEW,
        })
    }
}

export const plannedCollectionRepository = new PlannedCollectionRepository()
