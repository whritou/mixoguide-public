import { beforeEach, describe, expect, it, vi } from 'vitest'

type FakeInstance = {
    options: Record<string, unknown>
    status: string
    connect: ReturnType<typeof vi.fn>
}

const { mockEnv, instances, connectBehaviour } = vi.hoisted(() => ({
    mockEnv: {
        NODE_ENV: 'test',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_USERNAME: 'default',
        REDIS_PASSWORD: undefined as string | undefined,
    },
    instances: [] as FakeInstance[],
    connectBehaviour: { fail: false },
}))

vi.mock('@/lib/env', () => ({ env: mockEnv }))
vi.mock('ioredis', () => {
    class FakeRedis {
        status = 'wait'
        connect = vi.fn(async () => {
            if (connectBehaviour.fail) {
                this.status = 'reconnecting'
                throw new Error('ECONNREFUSED')
            }
            this.status = 'ready'
        })
        constructor(public options: Record<string, unknown>) {
            instances.push(this as unknown as FakeInstance)
        }
        on() {
            return this
        }
    }
    return { default: FakeRedis }
})

import { __resetRedisForTests, getRedis, redisRetryStrategy } from '@/lib/redis'

describe('redis client', () => {
    beforeEach(() => {
        __resetRedisForTests()
        instances.length = 0
        connectBehaviour.fail = false
        mockEnv.REDIS_PASSWORD = undefined
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    })

    it('retries with linear backoff capped at 5 s (never gives up)', () => {
        expect(redisRetryStrategy(1)).toBe(200)
        expect(redisRetryStrategy(10)).toBe(2000)
        expect(redisRetryStrategy(1000)).toBe(5000)
    })

    it('returns null without creating a client when Redis is not configured', async () => {
        await expect(getRedis()).resolves.toBeNull()
        expect(instances).toHaveLength(0)
    })

    it('connects once and returns the client only while it is ready', async () => {
        mockEnv.REDIS_PASSWORD = 'pw'

        const [a, b] = await Promise.all([getRedis(), getRedis()])
        expect(instances).toHaveLength(1)
        expect(instances[0].connect).toHaveBeenCalledTimes(1)
        expect(instances[0].options.retryStrategy).toBe(redisRetryStrategy)
        expect(a).toBe(instances[0])
        expect(b).toBe(instances[0])

        // Outage: ioredis flips status while reconnecting in the background.
        instances[0].status = 'reconnecting'
        await expect(getRedis()).resolves.toBeNull()

        // Recovered without recreating the client.
        instances[0].status = 'ready'
        await expect(getRedis()).resolves.toBe(instances[0])
        expect(instances).toHaveLength(1)
    })

    it('keeps the client for background reconnects when the initial connect fails', async () => {
        mockEnv.REDIS_PASSWORD = 'pw'
        connectBehaviour.fail = true

        await expect(getRedis()).resolves.toBeNull()
        expect(instances).toHaveLength(1)

        // ioredis reconnects on its own; no new client or connect() call is needed.
        instances[0].status = 'ready'
        await expect(getRedis()).resolves.toBe(instances[0])
        expect(instances).toHaveLength(1)
        expect(instances[0].connect).toHaveBeenCalledTimes(1)
    })
})
