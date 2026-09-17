import { getRedis } from '@/lib/redis'
import type { MakeableCocktail } from '@/types/models/cocktail'

const TTL_SECONDS = 30 * 60 // 30 minutes

function key(userId: string, maxMissing: number) {
    return `makeable:${userId}:${maxMissing}`
}

export async function getMakeableCache(
    userId: string,
    maxMissing: number,
): Promise<MakeableCocktail[] | null> {
    const redis = await getRedis()
    if (!redis) return null

    const raw = await redis.get(key(userId, maxMissing)).catch(() => null)
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

    await redis.set(key(userId, maxMissing), JSON.stringify(cocktails), 'EX', TTL_SECONDS).catch(() => null)
}

export async function invalidateMakeableCache(userId: string): Promise<void> {
    const redis = await getRedis()
    if (!redis) return

    // Scan and delete all makeable:{userId}:* keys
    let cursor = '0'
    do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', `makeable:${userId}:*`, 'COUNT', 20).catch(() => ['0', [] as string[]])
        if (keys.length > 0) await redis.del(...(keys as string[])).catch(() => null)
        cursor = next as string
    } while (cursor !== '0')
}
