import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import { Prisma } from '@prisma/client'
import type { UserFavoriteCocktail } from '@prisma/client'

class FavoriteRepository extends BaseRepository <
    UserFavoriteCocktail,
    Prisma.UserFavoriteCocktailUncheckedCreateInput,
    Prisma.UserFavoriteCocktailUncheckedUpdateInput
> {
    protected get model() {
        return toDelegate(prisma.userFavoriteCocktail)
    }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'userFavoriteCocktail',
            allowedSortFields: ['addedAt'],
            allowedFilters:    ['userId', 'cocktailId'],
            allowedIncludes:   ['cocktail', 'user'],
            searchFields:      [],
            defaultSortField:  'addedAt',
            softDelete:        false,
        }
    }

    /**
     * User-scoped lookup. Callers must pass the authenticated session userId;
     * this method intentionally hides favorites that belong to any other user.
     */
    async findByUserAndCocktail(userId: string, cocktailId: string) {
        return prisma.userFavoriteCocktail.findUnique({
            where: { userId_cocktailId: { userId, cocktailId } },
        })
    }

    /**
     * Idempotent add (DB-005): concurrent / repeated requests resolve to the same
     * row instead of racing a check-then-insert into a unique violation.
     */
    async addIdempotent(userId: string, cocktailId: string) {
        // Prisma's upsert is a read-then-write, not an atomic INSERT … ON CONFLICT,
        // so two concurrent adds can both try to insert. The loser's unique
        // violation (P2002) means the row now exists: return it.
        try {
            return await prisma.userFavoriteCocktail.create({ data: { userId, cocktailId } })
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                const existing = await this.findByUserAndCocktail(userId, cocktailId)
                if (existing) return existing
            }
            throw err
        }
    }

    /** Returns the number of deleted rows (0 or 1). */
    async removeByUserAndCocktail(userId: string, cocktailId: string): Promise<number> {
        const result = await prisma.userFavoriteCocktail.deleteMany({ where: { userId, cocktailId } })
        return result.count
    }

    /**
     * Returns favorites for one user only. The userId must come from auth context,
     * not from a client-controlled route/query parameter.
     */
    async findAllByUser(userId: string) {
        return prisma.userFavoriteCocktail.findMany({
            where:   { userId },
            select:  { cocktailId: true, addedAt: true },
            orderBy: { addedAt: 'desc' },
        })
    }

    async findAllByUserWithCocktailProfile(userId: string) {
        return prisma.userFavoriteCocktail.findMany({
            where: { userId },
            select: {
                cocktailId: true,
                cocktail: { select: { flavors: true, mainAlcoholId: true } },
            },
        })
    }
}

export const favoriteRepository = new FavoriteRepository()
