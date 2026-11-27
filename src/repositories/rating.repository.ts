import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import type { Rating } from '@prisma/client'

class RatingRepository extends BaseRepository<
    Rating,
    Prisma.RatingUncheckedCreateInput,
    Prisma.RatingUncheckedUpdateInput
> {
    protected get model() {
        return toDelegate(prisma.rating)
    }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'rating',
            allowedSortFields: ['createdAt', 'rating'],
            allowedFilters:    ['cocktailId', 'userId'],
            allowedIncludes:   ['user', 'cocktail'],
            searchFields:      [],
            defaultSortField:  'createdAt',
            softDelete:        false,
        }
    }

    // ─── LOOK-UPS ─────────────────────────────────────────────────────────────

    async findByUserAndCocktail(userId: string, cocktailId: string) {
        return prisma.rating.findUnique({
            where: { userId_cocktailId: { userId, cocktailId } },
        })
    }

    async findForCocktail(cocktailId: string, limit = 100) {
        return prisma.rating.findMany({
            where:   { cocktailId },
            include: { user: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: 'desc' },
            take:    limit,
        })
    }

    async findHighRatedCocktailIdsByUser(userId: string, minRating = 4) {
        const rows = await prisma.rating.findMany({
            where: { userId, rating: { gte: minRating } },
            select: { cocktailId: true },
        })
        return rows.map((r) => r.cocktailId)
    }

    // ─── AGGREGATION (uses precomputed cache on cocktails table) ──────────────

    /**
     * Returns precomputed avg/count from the cocktails table (O(1) lookup).
     * Falls back to a live aggregate for rows inserted before the migration ran.
     */
    async getStatsForCocktail(cocktailId: string) {
        // Use raw query so we don't depend on Prisma client re-generation being run
        const cached = await prisma.$queryRaw<
            { avg_rating: number | null; rating_count: number }[]
        >`SELECT avg_rating, rating_count FROM cocktails WHERE id = ${cocktailId}`

        const row = cached[0]
        if (row && row.rating_count > 0) {
            return {
                average: row.avg_rating,
                count:   row.rating_count,
                min:     null as number | null,
                max:     null as number | null,
            }
        }

        // Fallback: live aggregate (also used to get min/max when needed)
        const result = await prisma.rating.aggregate({
            where:  { cocktailId },
            _avg:   { rating: true },
            _count: { rating: true },
            _min:   { rating: true },
            _max:   { rating: true },
        })
        return {
            average: result._avg.rating,
            count:   result._count.rating,
            min:     result._min.rating,
            max:     result._max.rating,
        }
    }

    // ─── WRITE WITH CACHE MAINTENANCE ─────────────────────────────────────────

    /**
     * Upsert a rating and atomically refresh the cocktail's precomputed avg/count.
     */
    override async upsert(
        where:  Prisma.RatingWhereUniqueInput,
        create: Prisma.RatingUncheckedCreateInput,
        update: Prisma.RatingUncheckedUpdateInput,
    ): Promise<Rating> {
        return prisma.$transaction(async (tx) => {
            const rating = await tx.rating.upsert({ where, create, update })
            await this.refreshCocktailStats(rating.cocktailId, tx)
            return rating
        })
    }

    /**
     * Delete a rating and atomically refresh the cocktail's precomputed avg/count.
     */
    override async hardDelete(id: string): Promise<boolean> {
        const existing = await prisma.rating.findUnique({
            where:  { id },
            select: { cocktailId: true },
        })
        if (!existing) return false

        try {
            return await prisma.$transaction(async (tx) => {
                await tx.rating.delete({ where: { id } })
                await this.refreshCocktailStats(existing.cocktailId, tx)
                return true
            })
        } catch (err) {
            // Only "already deleted" maps to false; anything else is a real failure.
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return false
            throw err
        }
    }

    // ─── PRIVATE ──────────────────────────────────────────────────────────────

    /**
     * Recompute avg/count for a cocktail inside the current transaction (DB-006).
     *
     * The cocktail row is locked first (SELECT … FOR UPDATE), so concurrent rating
     * writes on the same cocktail serialise here. Because READ COMMITTED takes a
     * new snapshot per statement, the following single-statement UPDATE sees every
     * rating committed before the lock was granted plus this transaction's own
     * write: the last writer always stores the correct aggregate.
     */
    private async refreshCocktailStats(cocktailId: string, tx: Prisma.TransactionClient) {
        await tx.$queryRaw`SELECT id FROM cocktails WHERE id = ${cocktailId} FOR UPDATE`
        await tx.$executeRaw`
            UPDATE cocktails AS c
               SET avg_rating   = s.avg,
                   rating_count = s.cnt
              FROM (
                    SELECT avg(rating)::double precision AS avg, count(*)::int AS cnt
                      FROM ratings
                     WHERE cocktail_id = ${cocktailId}
                   ) AS s
             WHERE c.id = ${cocktailId}
        `
    }
}

export const ratingRepository = new RatingRepository()
