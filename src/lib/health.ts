import { prisma } from '@/lib/db/prisma'
import { env } from '@/lib/env'
import { getRedis } from '@/lib/redis'

export const HEALTH_CHECK_TIMEOUT_MS = 2000

export type CheckStatus = 'ok' | 'error' | 'skipped'

export type ReadinessReport = {
    status: 'ok' | 'error'
    db: CheckStatus
    redis: CheckStatus
}

/** Reject if `promise` does not settle within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    })
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function checkDb(): Promise<CheckStatus> {
    try {
        await withTimeout(prisma.$queryRaw`SELECT 1`, HEALTH_CHECK_TIMEOUT_MS, 'db')
        return 'ok'
    } catch {
        return 'error'
    }
}

async function checkRedis(): Promise<CheckStatus> {
    if (!env.REDIS_PASSWORD) return 'skipped'
    try {
        const redis = await withTimeout(getRedis(), HEALTH_CHECK_TIMEOUT_MS, 'redis connect')
        if (!redis) return 'error'
        await withTimeout(redis.ping(), HEALTH_CHECK_TIMEOUT_MS, 'redis ping')
        return 'ok'
    } catch {
        return 'error'
    }
}

/**
 * Readiness: DB is required; Redis is reported but only fails readiness when it is
 * configured (REDIS_PASSWORD set) and unreachable.
 */
export async function checkReadiness(): Promise<ReadinessReport> {
    const [db, redis] = await Promise.all([checkDb(), checkRedis()])
    const status = db === 'ok' && redis !== 'error' ? 'ok' : 'error'
    return { status, db, redis }
}
