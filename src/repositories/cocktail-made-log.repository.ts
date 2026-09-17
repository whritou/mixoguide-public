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

    override async create(data: Prisma.CocktailMadeLogUncheckedCreateInput) {
        return prisma.cocktailMadeLog.create({
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
