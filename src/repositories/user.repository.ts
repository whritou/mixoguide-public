// src/repositories/user.repository.ts
import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import type { User, Prisma } from '@prisma/client'

class UserRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
    protected get model() { return toDelegate(prisma.user) }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'user',
            allowedSortFields: ['name', 'email', 'createdAt', 'role'],
            allowedFilters:    ['role'],
            allowedIncludes:   ['accounts', 'pantryItems', 'favoriteCocktails', 'ratings'],
            searchFields:      ['name', 'email'],
            defaultSortField:  'createdAt',
        }
    }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  async findWithStats(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        image: true,
        role: true,
        createdAt: true,
        accounts: { select: { provider: true } },
        _count: {
          select: {
            favoriteCocktails: true,
            madeLogs: true,
            ratings: true,
            pantryItems: true,
            plannedCocktails: true,
          },
        },
      },
    })
  }
}

export const userRepository = new UserRepository()
