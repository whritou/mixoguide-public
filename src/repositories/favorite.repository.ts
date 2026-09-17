import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import type { UserFavoriteCocktail, Prisma } from '@prisma/client'

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
