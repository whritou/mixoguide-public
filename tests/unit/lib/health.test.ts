import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma, mockGetRedis, mockEnv } = vi.hoisted(() => ({
    mockPrisma: { $queryRaw: vi.fn() },
    mockGetRedis: vi.fn(),
    mockEnv: { NODE_ENV: 'test', REDIS_PASSWORD: undefined as string | undefined },
}))

vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/redis', () => ({ getRedis: mockGetRedis }))
vi.mock('@/lib/env', () => ({ env: mockEnv }))

import { checkReadiness, withTimeout, HEALTH_CHECK_TIMEOUT_MS } from '@/lib/health'

describe('checkReadiness', () => {
    beforeEach(() => {
        mockPrisma.$queryRaw.mockReset().mockResolvedValue([{ ok: 1 }])
        mockGetRedis.mockReset()
        mockEnv.REDIS_PASSWORD = undefined
    })

    it('uses a 2 s timeout per dependency', () => {
        expect(HEALTH_CHECK_TIMEOUT_MS).toBe(2000)
    })

    it('is ok with db ok and redis skipped when Redis is not configured', async () => {
        await expect(checkReadiness()).resolves.toEqual({ status: 'ok', db: 'ok', redis: 'skipped' })
        expect(mockGetRedis).not.toHaveBeenCalled()
    })

    it('fails when the DB is unreachable', async () => {
        mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('db down'))
        await expect(checkReadiness()).resolves.toMatchObject({ status: 'error', db: 'error' })
    })

    it('pings Redis when configured', async () => {
        mockEnv.REDIS_PASSWORD = 'pw'
        const ping = vi.fn().mockResolvedValue('PONG')
        mockGetRedis.mockResolvedValue({ ping })

        await expect(checkReadiness()).resolves.toEqual({ status: 'ok', db: 'ok', redis: 'ok' })
        expect(ping).toHaveBeenCalled()
    })

    it('fails when Redis is configured but not ready', async () => {
        mockEnv.REDIS_PASSWORD = 'pw'
        mockGetRedis.mockResolvedValue(null)

        await expect(checkReadiness()).resolves.toEqual({ status: 'error', db: 'ok', redis: 'error' })
    })

    it('fails when the Redis ping errors', async () => {
        mockEnv.REDIS_PASSWORD = 'pw'
        mockGetRedis.mockResolvedValue({ ping: vi.fn().mockRejectedValue(new Error('LOADING')) })

        await expect(checkReadiness()).resolves.toMatchObject({ status: 'error', redis: 'error' })
    })
})

describe('withTimeout', () => {
    it('rejects when the promise does not settle in time', async () => {
        await expect(withTimeout(new Promise(() => undefined), 10, 'db')).rejects.toThrow('db timed out after 10ms')
    })

    it('resolves with the value when the promise settles in time', async () => {
        await expect(withTimeout(Promise.resolve(42), 1000, 'x')).resolves.toBe(42)
    })
})
