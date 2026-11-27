import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooManyRequestsError } from '@/utils/errors'

const { mockGetRedis, mockEnv } = vi.hoisted(() => ({
    mockGetRedis: vi.fn(async (): Promise<unknown> => null),
    mockEnv: { NODE_ENV: 'test', TRUSTED_PROXY: undefined as undefined | string, REDIS_PASSWORD: undefined as undefined | string },
}))

vi.mock('@/lib/redis', () => ({ getRedis: mockGetRedis }))
vi.mock('@/lib/env', () => ({ env: mockEnv, requireEnv: (_: string, v: string) => v }))

import { nextRequest } from '../factories/auth'

import {
    __memStoreSize,
    __resetMemStore,
    checkRateLimit,
    getIp,
    MEM_STORE_MAX_ENTRIES,
    rateLimit,
    RATE_LIMIT_CONFIGS,
} from '@/lib/rateLimit'

describe('checkRateLimit', () => {
    beforeEach(() => {
        vi.useRealTimers()
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        mockGetRedis.mockResolvedValue(null)
        mockEnv.TRUSTED_PROXY = undefined
    })

    it('rejects once the fixed window threshold is exceeded', async () => {
        const identifier = `threshold-${Date.now()}`
        const max = RATE_LIMIT_CONFIGS['resend-verification'].maxRequests

        for (let i = 0; i < max; i++) {
            await expect(checkRateLimit('resend-verification', identifier)).resolves.toBeUndefined()
        }

        await expect(checkRateLimit('resend-verification', identifier)).rejects.toBeInstanceOf(TooManyRequestsError)
    })

    it('caps the public makeable preview at 120 requests per 10 minutes', async () => {
        expect(RATE_LIMIT_CONFIGS['makeable-preview']).toEqual({ maxRequests: 120, windowSeconds: 600 })

        const identifier = `preview-${Date.now()}`
        for (let i = 0; i < 120; i++) {
            await expect(checkRateLimit('makeable-preview', identifier)).resolves.toBeUndefined()
        }

        await expect(checkRateLimit('makeable-preview', identifier)).rejects.toBeInstanceOf(TooManyRequestsError)
    })

    it('allows requests again after the window resets', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-04-26T00:00:00.000Z'))

        const identifier = 'reset-window-user'
        const max = RATE_LIMIT_CONFIGS['change-password'].maxRequests

        for (let i = 0; i < max; i++) {
            await checkRateLimit('change-password', identifier)
        }

        await expect(checkRateLimit('change-password', identifier)).rejects.toBeInstanceOf(TooManyRequestsError)

        vi.advanceTimersByTime((RATE_LIMIT_CONFIGS['change-password'].windowSeconds * 1000) + 1)

        await expect(checkRateLimit('change-password', identifier)).resolves.toBeUndefined()
    })

    it('uses Redis when available', async () => {
        const redis = {
            incr: vi.fn().mockResolvedValue(1),
            expire: vi.fn().mockResolvedValue(1),
        }
        mockGetRedis.mockResolvedValueOnce(redis)

        await checkRateLimit('upload', 'user-1')

        expect(redis.incr).toHaveBeenCalledWith('rl:upload:user-1')
        expect(redis.expire).toHaveBeenCalledWith('rl:upload:user-1', RATE_LIMIT_CONFIGS.upload.windowSeconds)
    })

    it('keys authenticated helper calls by session user id', async () => {
        const redis = {
            incr: vi.fn().mockResolvedValue(1),
            expire: vi.fn().mockResolvedValue(1),
        }
        mockGetRedis.mockResolvedValueOnce(redis)

        await rateLimit(
            'change-password',
            nextRequest({ headers: { 'x-forwarded-for': '203.0.113.10' } }),
            { user: { id: 'user-42' } },
        )

        expect(redis.incr).toHaveBeenCalledWith('rl:change-password:user-42')
    })

    it('uses the leftmost x-forwarded-for entry when that proxy is trusted', async () => {
        mockEnv.TRUSTED_PROXY = 'x-forwarded-for'
        const redis = {
            incr: vi.fn().mockResolvedValue(1),
            expire: vi.fn().mockResolvedValue(1),
        }
        mockGetRedis.mockResolvedValueOnce(redis)

        await rateLimit(
            'public-read',
            nextRequest({ headers: { 'x-forwarded-for': '198.51.100.8, 10.0.0.1' } }),
        )

        expect(redis.incr).toHaveBeenCalledWith('rl:public-read:198.51.100.8')
    })

    it('uses the Cloudflare connecting IP header when Cloudflare is the trusted proxy', () => {
        mockEnv.TRUSTED_PROXY = 'cloudflare'
        expect(getIp(new Headers({
            'cf-connecting-ip': '203.0.113.44',
            'x-forwarded-for': '198.51.100.8',
        }))).toBe('203.0.113.44')
    })

    it('ignores forwarding headers when no proxy is trusted (secure default)', () => {
        mockEnv.TRUSTED_PROXY = undefined
        expect(getIp(new Headers({
            'cf-connecting-ip': '203.0.113.44',
            'x-forwarded-for': '198.51.100.8',
            'x-real-ip': '198.51.100.9',
        }))).toBe('unknown')
    })

    it('does not honour a header it has not been told to trust', () => {
        mockEnv.TRUSTED_PROXY = 'cloudflare'
        expect(getIp(new Headers({
            'x-forwarded-for': '198.51.100.8',
        }))).toBe('unknown')
    })
})

describe('in-memory fallback store', () => {
    beforeEach(() => {
        vi.useRealTimers()
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        mockGetRedis.mockResolvedValue(null)
        __resetMemStore()
    })

    it('sweeps expired entries once the sweep interval has elapsed', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-04-26T00:00:00.000Z'))

        for (let i = 0; i < 50; i++) await checkRateLimit('rating', `sweep-${i}`)
        expect(__memStoreSize()).toBe(50)

        // rating window is 60 s; advance past both window and sweep interval.
        vi.advanceTimersByTime(61_000)
        await checkRateLimit('rating', 'sweep-new')

        expect(__memStoreSize()).toBe(1)
    })

    it('caps the store size and evicts the oldest keys first', async () => {
        for (let i = 0; i < MEM_STORE_MAX_ENTRIES + 25; i++) {
            await checkRateLimit('public-read', `cap-${i}`)
        }

        expect(__memStoreSize()).toBe(MEM_STORE_MAX_ENTRIES)

        // The newest key is still tracked (counts toward its limit)...
        const newest = `cap-${MEM_STORE_MAX_ENTRIES + 24}`
        for (let i = 1; i < RATE_LIMIT_CONFIGS['public-read'].maxRequests; i++) {
            await checkRateLimit('public-read', newest)
        }
        await expect(checkRateLimit('public-read', newest)).rejects.toBeInstanceOf(TooManyRequestsError)
    })

    it('logs the fallback at most once per minute, in every environment', async () => {
        mockEnv.NODE_ENV = 'production'
        mockEnv.REDIS_PASSWORD = 'configured'
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        try {
            await checkRateLimit('rating', 'log-1')
            await checkRateLimit('rating', 'log-2')

            const fallbackLogs = warn.mock.calls.filter(([line]) => String(line).includes('rateLimit.memory_fallback'))
            expect(fallbackLogs).toHaveLength(1)
            expect(JSON.parse(String(fallbackLogs[0][0]))).toMatchObject({
                level: 'warn',
                action: 'rating',
                reason: 'redis_unavailable',
            })
        } finally {
            mockEnv.NODE_ENV = 'test'
            mockEnv.REDIS_PASSWORD = undefined
        }
    })

    it('falls back to memory when a Redis command fails', async () => {
        const redis = {
            incr: vi.fn().mockRejectedValue(new Error('READONLY')),
            expire: vi.fn(),
        }
        mockGetRedis.mockResolvedValueOnce(redis)

        await expect(checkRateLimit('upload', 'redis-fail')).resolves.toBeUndefined()
        expect(__memStoreSize()).toBe(1)
    })
})
