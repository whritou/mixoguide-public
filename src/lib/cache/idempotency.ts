import { getRedis } from '@/lib/redis'

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60

/** Accept only short opaque keys (UUIDs, ULIDs, random tokens). */
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

export function normalizeIdempotencyKey(raw: string | null | undefined): string | null {
    if (!raw) return null
    const key = raw.trim()
    return KEY_PATTERN.test(key) ? key : null
}

/**
 * Try to claim an idempotency key for a user-scoped operation.
 * Returns `true` when the caller owns the key (first request) or when Redis is
 * unavailable (best effort: the operation then proceeds without deduplication),
 * and `false` when the same key was already used.
 */
export async function claimIdempotencyKey(scope: string, userId: string, key: string): Promise<boolean> {
    const redis = await getRedis()
    if (!redis) return true

    const result = await redis
        .set(`idem:${scope}:${userId}:${key}`, '1', 'EX', IDEMPOTENCY_TTL_SECONDS, 'NX')
        .catch(() => 'OK' as const)
    return result === 'OK'
}

/** Release a claimed key after the operation failed, so the client can retry. */
export async function releaseIdempotencyKey(scope: string, userId: string, key: string): Promise<void> {
    const redis = await getRedis()
    if (!redis) return
    await redis.del(`idem:${scope}:${userId}:${key}`).catch(() => null)
}
