import { prisma } from '@/lib/db/prisma'
import { BaseRepository, toDelegate, type RepositoryConfig } from './base.repository'
import { QueryBuilder } from '@/lib/query/QueryBuilder'
import type { CocktailMadeLog, Prisma } from '@prisma/client'

/** Fields included for display in the Made tab card */
const COCKTAIL_SELECT = {
    id: true, name: true, imageUrl: true, difficulty: true,
} as const

function visibleMadeLogWhere(): Prisma.CocktailMadeLogWhereInput {
    return { archived: false }
}

function normalizeMadeLogRow<T extends { note?: string | null; archived?: boolean | null; archivedCocktail?: unknown }>(row: T) {
    return {
        ...row,
        note: row.note ?? null,
        archived: row.archived ?? false,
        archivedCocktail: row.archivedCocktail ?? null,
    }
}

class CocktailMadeLogRepository extends BaseRepository<
    CocktailMadeLog,
    Prisma.CocktailMadeLogUncheckedCreateInput,
    Prisma.CocktailMadeLogUncheckedUpdateInput
> {
    protected get model() {
        return toDelegate(prisma.cocktailMadeLog)
    }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'cocktailMadeLog',
            allowedSortFields: ['madeAt'],
            allowedFilters:    ['userId', 'cocktailId'],
            allowedIncludes:   ['cocktail', 'user'],
            searchFields:      [],
            defaultSortField:  'madeAt',
            defaultOrderBy:    { madeAt: 'desc' },
            softDelete:        false,
        }
    }

    /**
     * Returns only logs owned by the supplied userId.
     * Callers must pass the authenticated session user id, not a client-supplied id.
     */
    async findByUser(userId: string, page = 1, limit = 50, includeArchived = false) {
        const { skip, take, page: safePage, limit: safeLimit } = QueryBuilder.getPaginationArgs({ page, limit })

        const where = {
            userId,
            ...(includeArchived ? {} : visibleMadeLogWhere()),
        }

        const [rows, total] = await Promise.all([
            prisma.cocktailMadeLog.findMany({
                where,
                orderBy: { madeAt: 'desc' },
                skip,
                take,
                select: {
                    id: true,
                    userId: true,
                    cocktailId: true,
                    quantity: true,
                    madeAt: true,
                    note: true,
                    archived: true,
                    archivedCocktail: true,
                    cocktail: { select: COCKTAIL_SELECT },
                },
            }),
            prisma.cocktailMadeLog.count({ where }),
        ])
        const data = rows.map((row) => normalizeMadeLogRow(row))

        return QueryBuilder.buildPaginatedResult(data, total, safePage, safeLimit)
    }

    override async create(
        data: Prisma.CocktailMadeLogUncheckedCreateInput,
        tx: Prisma.TransactionClient = prisma,
    ) {
        return tx.cocktailMadeLog.create({
            data: {
                userId:    data.userId,
                cocktailId: data.cocktailId,
                quantity:  data.quantity,
                madeAt:    data.madeAt ?? new Date(),
                note:      data.note,
                archived: data.archived ?? false,
                archivedCocktail: data.archivedCocktail,
            },
            select: {
                id: true,
                userId: true,
                cocktailId: true,
                quantity: true,
                madeAt: true,
                note: true,
                archived: true,
                archivedCocktail: true,
                cocktail: { select: COCKTAIL_SELECT },
            },
        }).then((row) => normalizeMadeLogRow(row))
    }

    /**
     * User-scoped recommendation helper.
     * The userId must come from the session so another user's history is never queried.
     */
    async findCocktailIdsByUser(userId: string, since?: Date): Promise<string[]> {
        const rows = await prisma.cocktailMadeLog.findMany({
            where: {
                userId,
                cocktailId: { not: null },
                ...visibleMadeLogWhere(),
                ...(since ? { madeAt: { gte: since } } : {}),
            },
            select: { cocktailId: true },
            distinct: ['cocktailId'],
        })
        return rows.flatMap((r) => r.cocktailId ? [r.cocktailId] : [])
    }

    /**
     * One row per distinct cocktail the user made (visible logs), with the most
     * recent `madeAt`. Replaces two separate distinct-id loads (DB-011).
     */
    async findLastMadeByCocktail(userId: string): Promise<Array<{ cocktailId: string; lastMadeAt: Date }>> {
        const rows = await prisma.cocktailMadeLog.groupBy({
            by: ['cocktailId'],
            where: { userId, cocktailId: { not: null }, ...visibleMadeLogWhere() },
            _max: { madeAt: true },
        })
        return rows.flatMap((r) => (r.cocktailId && r._max.madeAt ? [{ cocktailId: r.cocktailId, lastMadeAt: r._max.madeAt }] : []))
    }

    /**
     * Stats inputs aggregated in SQL (DB-011) instead of loading every log row:
     *  - drinks per local calendar day (`tz` = IANA zone, validated by the caller),
     *  - top cocktails by quantity (live id or archived snapshot id).
     * Includes user-archived (hidden) entries, like the previous implementation.
     */
    async getStatsAggregates(userId: string, tz: string, topLimit = 5) {
        const [days, top] = await Promise.all([
            prisma.$queryRaw<Array<{ day: string; drinks: number }>>`
                SELECT to_char((made_at AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day,
                       SUM(quantity)::int AS drinks
                  FROM cocktail_made_logs
                 WHERE user_id = ${userId}
                 GROUP BY 1
                 ORDER BY 1
            `,
            prisma.$queryRaw<Array<{ cocktailKey: string; count: number }>>`
                SELECT COALESCE(cocktail_id, archived_cocktail->>'id') AS "cocktailKey",
                       SUM(quantity)::int AS count
                  FROM cocktail_made_logs
                 WHERE user_id = ${userId}
                   AND COALESCE(cocktail_id, archived_cocktail->>'id') IS NOT NULL
                 GROUP BY 1
                 ORDER BY 2 DESC, 1
                 LIMIT ${topLimit * 3}
            `,
        ])
        return { days, top }
    }

    /** Display data (live cocktail or archived snapshot) for the given cocktail keys. */
    async findDisplayForCocktailKeys(userId: string, keys: string[]) {
        if (keys.length === 0) return { live: [], archived: [] }
        const [live, archived] = await Promise.all([
            prisma.cocktail.findMany({
                where: { id: { in: keys } },
                select: { id: true, name: true, imageUrl: true },
            }),
            prisma.$queryRaw<Array<{ id: string; snapshot: unknown }>>`
                SELECT DISTINCT ON (archived_cocktail->>'id') archived_cocktail->>'id' AS id, archived_cocktail AS snapshot
                  FROM cocktail_made_logs
                 WHERE user_id = ${userId}
                   AND cocktail_id IS NULL
                   AND archived_cocktail->>'id' = ANY(${keys}::text[])
                 ORDER BY archived_cocktail->>'id', made_at DESC
            `,
        ])
        return { live, archived }
    }

    async findAllByUserForStats(userId: string) {
        const rows = await prisma.cocktailMadeLog.findMany({
            where: { userId },
            select: {
                madeAt: true,
                quantity: true,
                cocktailId: true,
                note: true,
                archived: true,
                archivedCocktail: true,
                cocktail: { select: { name: true, imageUrl: true } },
            },
            orderBy: { madeAt: 'asc' },
        })
        return rows.map((row) => normalizeMadeLogRow(row))
    }

    async findAllByUserWithCocktail(userId: string) {
        return this.findAllByUserForStats(userId)
    }

    async findOwnershipById(id: string) {
        return prisma.cocktailMadeLog.findUnique({
            where: { id },
            select: { id: true, userId: true },
        })
    }

    async findByUserSince(userId: string, since: Date) {
        return prisma.cocktailMadeLog.findMany({
            where: { userId, madeAt: { gte: since } },
            select: { madeAt: true, quantity: true },
        })
    }

    async archiveById(id: string): Promise<boolean> {
        const result = await prisma.cocktailMadeLog.updateMany({
            where: { id, archived: false },
            data: { archived: true },
        })
        return result.count > 0
    }
}

export const cocktailMadeLogRepository = new CocktailMadeLogRepository()
