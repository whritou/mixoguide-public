import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig, toDelegate } from './base.repository'
import type { Suggestion, Prisma } from '@prisma/client'
import type { QueryParams, PaginatedResult } from '@/lib/query/types'

class SuggestionRepository extends BaseRepository<
    Suggestion,
    Prisma.SuggestionUncheckedCreateInput,
    Prisma.SuggestionUncheckedUpdateInput
> {
    protected get model() {
        return toDelegate(prisma.suggestion)
    }

    protected get config(): RepositoryConfig {
        return {
            modelName:         'suggestion',
            allowedSortFields: ['createdAt', 'status', 'type'],
            allowedFilters:    ['status', 'type', 'userId'],
            allowedIncludes:   ['user'],
            searchFields:      ['title', 'content', 'targetName'],
            defaultSortField:  'createdAt',
            softDelete:        false,
        }
    }

    async findWithUser(id: string) {
        return prisma.suggestion.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
            },
        })
    }

    async findMany(params: QueryParams = {}): Promise<PaginatedResult<Suggestion>> {
        return super.findMany({
            ...params,
            include: Array.from(new Set([...(params.include ?? []), 'user'])),
        })
    }

    async countCreatedSince(userId: string, since: Date) {
        return prisma.suggestion.count({
            where: {
                userId,
                createdAt: { gte: since },
            },
        })
    }

}

export const suggestionRepository = new SuggestionRepository()
