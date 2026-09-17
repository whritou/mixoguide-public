// src/services/base.service.ts
// Generic service base — CRUD business logic shared by all resource services.

import type { BaseRepository } from '@/repositories/base.repository'
import type { QueryParams, PaginatedResult } from '@/lib/query/types'
import { NotFoundError } from '@/utils/errors'

export abstract class BaseService<T, CreateDTO, UpdateDTO> {
    protected abstract get repository(): BaseRepository<T, CreateDTO, UpdateDTO>
    protected abstract get entityName(): string

    /**
     * Override to 'hard' for resources without a deletedAt column.
     * Defaults to 'soft' (sets deletedAt, does not physically remove the row).
     */
    protected get deleteStrategy(): 'soft' | 'hard' { return 'soft' }

    async getAll(params: QueryParams): Promise<PaginatedResult<T>> {
        return this.repository.findMany(params)
    }

    async getById(id: string, include?: string[]): Promise<T> {
        const entity = await this.repository.findById(id, include)
        if (!entity) throw new NotFoundError(`${this.entityName} not found`)
        return entity
    }

    async create(data: CreateDTO): Promise<T> {
        return this.repository.create(data)
    }

    async update(id: string, data: UpdateDTO): Promise<T> {
        const entity = await this.repository.update(id, data)
        if (!entity) throw new NotFoundError(`${this.entityName} not found`)
        return entity
    }

    async delete(id: string): Promise<void> {
        const ok = this.deleteStrategy === 'hard'
            ? await this.repository.hardDelete(id)
            : await this.repository.softDelete(id)
        if (!ok) throw new NotFoundError(`${this.entityName} not found`)
    }
}
