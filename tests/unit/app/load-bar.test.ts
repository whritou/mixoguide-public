import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooManyRequestsError } from '@/utils/errors'

const { mockPreview, mockFindIdsByNames, mockCheckRateLimit, cacheStore } = vi.hoisted(() => ({
    mockPreview: vi.fn(),
    mockFindIdsByNames: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    cacheStore: new Map<string, unknown>(),
}))

vi.mock('next/cache', () => ({
    unstable_cache: (fn: (key: string) => Promise<unknown>) => async (key: string) => {
        if (cacheStore.has(key)) return cacheStore.get(key)
        const value = await fn(key)
        cacheStore.set(key, value)
        return value
    },
}))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: mockCheckRateLimit, getIp: () => 'unknown' }))
vi.mock('@/services/cocktail.service', () => ({ cocktailService: { previewMakeable: mockPreview } }))
vi.mock('@/services/ingredient.service', () => ({ ingredientService: { findIdsByNames: mockFindIdsByNames } }))

import { loadRateLimitedBar, loadSharedBar } from '@/app/(home)/bar/load-bar'
import { encodeBarParam } from '@/lib/demo-bar/bar-param'

const PREVIEW = { makeableCount: 2, top: [], oneBottleAway: null }

describe('loadSharedBar', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        cacheStore.clear()
        mockFindIdsByNames.mockResolvedValue({})
        mockCheckRateLimit.mockResolvedValue(undefined)
    })

    it('does not cache a database error', async () => {
        const param = encodeBarParam(['gin', 'lime'])
        mockPreview.mockRejectedValueOnce(new Error('db down')).mockResolvedValueOnce(PREVIEW)

        expect((await loadSharedBar(param)).preview).toBeNull()
        expect((await loadSharedBar(param)).preview).toEqual(PREVIEW)
        expect(mockPreview).toHaveBeenCalledTimes(2)
    })

    it('drops ids longer than 64 characters before building the cache key', async () => {
        mockPreview.mockResolvedValue(PREVIEW)

        await loadSharedBar(encodeBarParam(['gin', 'x'.repeat(65)]))

        expect(mockPreview).toHaveBeenCalledWith(['gin'], 0)
        expect([...cacheStore.keys()]).toEqual([encodeBarParam(['gin'])])
    })

    it('renders the empty state without touching the database once rate-limited', async () => {
        mockCheckRateLimit.mockRejectedValue(new TooManyRequestsError('slow down'))

        const bar = await loadRateLimitedBar(encodeBarParam(['gin']))

        expect(bar.preview).toBeNull()
        expect(mockCheckRateLimit).toHaveBeenCalledWith('makeable-preview', 'unknown')
        expect(mockPreview).not.toHaveBeenCalled()
    })

    it('loads the bar while under the limit', async () => {
        mockPreview.mockResolvedValue(PREVIEW)

        expect((await loadRateLimitedBar(encodeBarParam(['gin']))).preview).toEqual(PREVIEW)
    })
})
