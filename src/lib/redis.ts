import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

type RedisClient = import('ioredis').Redis

let redisClient: RedisClient | null = null
let connecting: Promise<void> | null = null

/** Exponential-ish backoff, capped at 5 s. ioredis keeps retrying forever. */
export function redisRetryStrategy(times: number): number {
    return Math.min(times * 200, 5000)
}

async function createClient(): Promise<RedisClient> {
    const { default: Redis } = await import('ioredis')

    const client = new Redis({
        host:               env.REDIS_HOST,
        port:               env.REDIS_PORT,
        username:           env.REDIS_USERNAME,
        password:           env.REDIS_PASSWORD,
        lazyConnect:        true,
        // Fail fast while disconnected: callers fall back instead of queueing.
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout:     2000,
        retryStrategy:      redisRetryStrategy,
    })

    let lastError: string | undefined
    client.on('ready', () => {
        lastError = undefined
        logger.info('redis.ready', { host: env.REDIS_HOST, port: env.REDIS_PORT })
    })
    client.on('error', (err: Error) => {
        // ioredis emits the same error on every retry; log only when it changes.
        if (err.message === lastError) return
        lastError = err.message
        logger.warn('redis.error', { error: err.message })
    })
    client.on('close', () => logger.warn('redis.close'))
    client.on('reconnecting', (delay: number) => logger.info('redis.reconnecting', { delayMs: delay }))
    client.on('end', () => logger.error('redis.end', { reason: 'connection ended, no more retries' }))

    return client
}

/**
 * Returns the shared Redis client when it is connected and ready, otherwise
 * `null` (callers must degrade gracefully). The client is created and connected
 * once; after an outage ioredis reconnects in the background with backoff, so
 * a later call returns the client again without a process restart.
 */
export async function getRedis(): Promise<RedisClient | null> {
    if (!env.REDIS_PASSWORD) return null

    if (!redisClient) {
        if (!connecting) {
            connecting = (async () => {
                const client = await createClient()
                redisClient = client
                try {
                    await client.connect()
                } catch (err) {
                    // retryStrategy keeps reconnecting in the background.
                    logger.warn('redis.connect_failed', {
                        error: err instanceof Error ? err.message : String(err),
                    })
                }
            })().finally(() => { connecting = null })
        }
        await connecting
    }

    return redisClient?.status === 'ready' ? redisClient : null
}

/** Test helper: drop the cached client. */
export function __resetRedisForTests(): void {
    redisClient = null
    connecting = null
}
