import { env } from '@/lib/env'

let redisClient: import('ioredis').Redis | null = null
let redisReady = false

export async function getRedis(): Promise<import('ioredis').Redis | null> {
    if (!env.REDIS_PASSWORD) return null

    if (!redisClient) {
        const { default: Redis } = await import('ioredis')

        redisClient = new Redis({
            host:               env.REDIS_HOST,
            port:               env.REDIS_PORT,
            username:           env.REDIS_USERNAME,
            password:           env.REDIS_PASSWORD,
            lazyConnect:        true,
            enableOfflineQueue: false,
            retryStrategy:      () => null,
        })

        redisClient.on('ready', () => { redisReady = true })
        redisClient.on('error', () => { redisReady = false })
        redisClient.on('close', () => { redisReady = false })

        try {
            await redisClient.connect()
        } catch {
            redisReady = false
        }
    }

    return redisReady ? redisClient : null
}
