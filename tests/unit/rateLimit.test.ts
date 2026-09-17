import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooManyRequestsError } from '@/utils/errors'

const { mockGetRedis, mockEnv } = vi.hoisted(() => ({
    mockGetRedis: vi.fn(async (): Promise<unknown> => null),
    mockEnv: { NODE_ENV: 'test', TRUSTED_PROXY: undefined as undefined | string },
}))

vi.mock('@/lib/redis', () => ({ getRedis: mockGetRedis }))
vi.mock('@/lib/env', () => ({ env: mockEnv, requireEnv: (_: string, v: string) => v }))

import { nextRequest } from '../factories/auth'

import { checkRateLimit, getIp, rateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rateLimit'

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
