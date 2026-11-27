import { getRedis } from '@/lib/redis'
import type { MakeableCocktail } from '@/types/models/cocktail'

/**
 * Per-user makeable / recommendation cache (DB-010, BPERF-001).
 *
 * Key layout (no SCAN needed for invalidation):
 *   makeable:{userId}              HASH   field "{catalogVersion}:{maxMissing}" → JSON
 *   recommendations:{userId}       STRING JSON { v: catalogVersion, data }
 *   makeable:catalog-version       STRING integer, bumped on any catalog change
 *
 * - A pantry write for one user is a single `DEL` of that user's keys.
 * - A catalog change (cocktail / recipe / ingredient / derivation edit) bumps the
 *   global version: every cached entry built for an older version is ignored
 *   and eventually expires with its TTL.
 */

const MAKEABLE_TTL_SECONDS = 30 * 60 // 30 minutes
const RECOMMENDATIONS_TTL_SECONDS = 5 * 60 // 5 minutes

export const MAX_MISSING_LIMIT = 10
export const DEFAULT_MAX_MISSING = 3

export const CATALOG_VERSION_KEY = 'makeable:catalog-version'

export function makeableKey(userId: string): string {
    return `makeable:${userId}`
}

export function makeableField(catalogVersion: string, maxMissing: number): string {
    return `${catalogVersion}:${maxMissing}`
}

export function recommendationsKey(userId: string): string {
    return `recommendations:${userId}`
}

/**
 * Normalise a client-supplied `maxMissing` to an integer in [0, MAX_MISSING_LIMIT].
 * Missing / non-numeric values fall back to the default; fractions are floored.
 */
export function clampMaxMissing(raw: unknown, fallback = DEFAULT_MAX_MISSING): number {
    if (raw === null || raw === undefined || raw === '') return fallback
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(n)) return fallback
    return Math.min(Math.max(Math.floor(n), 0), MAX_MISSING_LIMIT)
}

type RedisClient = NonNullable<Awaited<ReturnType<typeof getRedis>>>

async function getCatalogVersion(redis: RedisClient): Promise<string> {
    const v = await redis.get(CATALOG_VERSION_KEY).catch(() => null)
    return v ?? '0'
}

export async function getMakeableCache(
    userId: string,
    maxMissing: number,
): Promise<MakeableCocktail[] | null> {
    const redis = await getRedis()
    if (!redis) return null

    const version = await getCatalogVersion(redis)
    const raw = await redis.hget(makeableKey(userId), makeableField(version, maxMissing)).catch(() => null)
    if (!raw) return null

    try {
        return JSON.parse(raw) as MakeableCocktail[]
    } catch {
        return null
    }
}

export async function setMakeableCache(
    userId: string,
    maxMissing: number,
    cocktails: MakeableCocktail[],
): Promise<void> {
    const redis = await getRedis()
    if (!redis) return

    const version = await getCatalogVersion(redis)
    const key = makeableKey(userId)
    await redis
        .multi()
        .hset(key, makeableField(version, maxMissing), JSON.stringify(cocktails))
        .expire(key, MAKEABLE_TTL_SECONDS)
        .exec()
        .catch(() => null)
}

export async function getRecommendationsCache<T>(userId: string): Promise<T | null> {
    const redis = await getRedis()
    if (!redis) return null

    const [version, raw] = await Promise.all([
        getCatalogVersion(redis),
        redis.get(recommendationsKey(userId)).catch(() => null),
    ])
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as { v: string; data: T }
        return parsed.v === version ? parsed.data : null
    } catch {
        return null
    }
}

export async function setRecommendationsCache<T>(userId: string, data: T): Promise<void> {
    const redis = await getRedis()
    if (!redis) return

    const version = await getCatalogVersion(redis)
    await redis
        .set(recommendationsKey(userId), JSON.stringify({ v: version, data }), 'EX', RECOMMENDATIONS_TTL_SECONDS)
        .catch(() => null)
}

/** Drop every derived cache entry of one user (pantry / history / rating change). */
export async function invalidateMakeableCache(userId: string): Promise<void> {
    const redis = await getRedis()
    if (!redis) return

    await redis.del(makeableKey(userId), recommendationsKey(userId)).catch(() => null)
}

/** Invalidate makeable/recommendation caches of ALL users after a catalog change. */
export async function bumpCatalogVersion(): Promise<void> {
    const redis = await getRedis()
    if (!redis) return

    await redis.incr(CATALOG_VERSION_KEY).catch(() => null)
}
