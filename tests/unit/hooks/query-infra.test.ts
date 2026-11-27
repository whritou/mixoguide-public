import { describe, expect, it, vi } from 'vitest'
import type { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/fetcher'
import { flattenUnique, nextOffset } from '@/lib/api/pagination'
import { invalidators } from '@/lib/invalidation'
import { shouldRetryQuery } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { computeOptimisticStats } from '@/hooks/mutations/use-rate-mutation'

function fakeQueryClient() {
    const invalidateQueries = vi.fn(() => Promise.resolve())
    return { qc: { invalidateQueries } as unknown as QueryClient, invalidateQueries }
}

describe('nextOffset', () => {
    const page = (n: number, total?: number) => ({ items: Array.from({ length: n }, (_, i) => ({ id: `${i}` })), meta: { total } })

    it('returns the loaded count while below total', () => {
        expect(nextOffset(page(20, 45), [page(20, 45)])).toBe(20)
        expect(nextOffset(page(20, 45), [page(20, 45), page(20, 45)])).toBe(40)
    })

    it('stops at total, on an empty page, or when total is unknown', () => {
        expect(nextOffset(page(5, 45), [page(20, 45), page(20, 45), page(5, 45)])).toBeUndefined()
        expect(nextOffset(page(0, 45), [page(20, 45), page(0, 45)])).toBeUndefined()
        expect(nextOffset(page(20), [page(20)])).toBeUndefined()
    })
})

describe('flattenUnique', () => {
    it('flattens pages and drops duplicate ids', () => {
        const pages = [
            { items: [{ id: 'a' }, { id: 'b' }], meta: {} },
            { items: [{ id: 'b' }, { id: 'c' }], meta: {} },
        ]
        expect(flattenUnique(pages).map((x) => x.id)).toEqual(['a', 'b', 'c'])
        expect(flattenUnique(undefined)).toEqual([])
    })
})

describe('shouldRetryQuery', () => {
    it('does not retry deterministic 4xx ApiErrors', () => {
        for (const status of [400, 401, 403, 404, 422]) {
            expect(shouldRetryQuery(0, new ApiError(status, 'x'))).toBe(false)
        }
    })

    it('retries 5xx, 408, 429 and network errors up to twice', () => {
        expect(shouldRetryQuery(0, new ApiError(500, 'x'))).toBe(true)
        expect(shouldRetryQuery(0, new ApiError(408, 'x'))).toBe(true)
        expect(shouldRetryQuery(1, new ApiError(429, 'x'))).toBe(true)
        expect(shouldRetryQuery(1, new TypeError('Failed to fetch'))).toBe(true)
        expect(shouldRetryQuery(2, new TypeError('Failed to fetch'))).toBe(false)
    })

    it('no longer depends on the error message text', () => {
        expect(shouldRetryQuery(0, new Error('GET /api/x → 401'))).toBe(true)
    })
})

describe('invalidators', () => {
    it('return a promise that settles after every invalidation', async () => {
        const { qc, invalidateQueries } = fakeQueryClient()
        const result = invalidators.pantry(qc)
        expect(result).toBeInstanceOf(Promise)
        await result
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.pantry.all })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.makeable.all })
    })

    it('narrows rating invalidation to the rated cocktail and only marks lists stale', async () => {
        const { qc, invalidateQueries } = fakeQueryClient()
        await invalidators.ratings(qc, 'c1')

        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.ratings.list({ cocktailId: 'c1' }) })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.cocktails.detail('c1') })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.cocktails.lists(), refetchType: 'none' })
        expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: queryKeys.cocktails.all })
        // Stats are written from the mutation response, not refetched.
        expect(invalidateQueries).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: queryKeys.ratings.stats('c1') }))
    })

    it('marks broad cocktail/makeable caches stale (no refetch) on ingredient edits', async () => {
        const { qc, invalidateQueries } = fakeQueryClient()
        await invalidators.ingredients(qc)
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.ingredients.all })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.cocktails.all, refetchType: 'none' })
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.makeable.all, refetchType: 'none' })
    })
})

describe('query keys', () => {
    it('nests infinite lists under lists() so list invalidation reaches them', () => {
        const infinite = queryKeys.cocktails.infinite({ search: 'gin' })
        expect(infinite.slice(0, 2)).toEqual([...queryKeys.cocktails.lists()])
        expect(queryKeys.plannedCocktails.state('c1').slice(0, 1)).toEqual([...queryKeys.plannedCocktails.all])
    })
})

describe('computeOptimisticStats', () => {
    it('adds, changes and removes a user rating', () => {
        expect(computeOptimisticStats({ avg: 4, count: 2 }, null, 1)).toEqual({ avg: 3, count: 3 })
        expect(computeOptimisticStats({ avg: 4, count: 2 }, 5, 3)).toEqual({ avg: 3, count: 2 })
        expect(computeOptimisticStats({ avg: 4, count: 2 }, 5, 0)).toEqual({ avg: 3, count: 1 })
        expect(computeOptimisticStats({ avg: 4, count: 1 }, 4, 0)).toEqual({ avg: null, count: 0 })
    })
})
