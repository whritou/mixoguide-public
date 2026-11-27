// src/repositories/user.repository.ts
import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import type { User, Prisma } from '@prisma/client'
import { QueryBuilder } from '@/lib/query/QueryBuilder'
import type { QueryParams, PaginatedResult } from '@/lib/query/types'

/** Columns an admin list may show. Never the password hash (SEC-017). */
const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

class UserRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
    protected get model() { return toDelegate(prisma.user) }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'user',
            allowedSortFields: ['name', 'email', 'createdAt', 'role'],
            allowedFilters:    ['role'],
            // 'accounts' intentionally NOT allowed: it holds OAuth credentials (SEC-017).
            allowedIncludes:   ['pantryItems', 'favoriteCocktails', 'ratings'],
            searchFields:      ['name', 'email'],
            defaultSortField:  'createdAt',
        }
    }

  /** Admin listing: explicit projection instead of full rows. */
  async findMany(params: QueryParams = {}): Promise<PaginatedResult<User>> {
    const { skip, take, page, limit, orderBy, where, include } = QueryBuilder.build(params, this.config)
    const counts = include ? Object.keys(include) : []
    const select = {
      ...ADMIN_USER_SELECT,
      ...(counts.length ? { _count: { select: Object.fromEntries(counts.map((k) => [k, true])) } } : {}),
    }
    const [data, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy, skip, take, select }),
      prisma.user.count({ where }),
    ])
    return QueryBuilder.buildPaginatedResult(data as unknown as User[], total, page, limit)
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  /** Minimal auth projection for re-authentication checks. */
  async findAuthById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, password: true } })
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
