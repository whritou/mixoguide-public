import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRedis, mockGetRedis } = vi.hoisted(() => {
    const store = new Map<string, string>()
    const hashes = new Map<string, Map<string, string>>()
    const multi = () => {
        const ops: Array<() => void> = []
        const chain = {
            hset: (key: string, field: string, value: string) => {
                ops.push(() => {
                    const h = hashes.get(key) ?? new Map<string, string>()
                    h.set(field, value)
                    hashes.set(key, h)
                })
                return chain
            },
            expire: () => chain,
            exec: async () => { ops.forEach((op) => op()); return [] },
        }
        return chain
    }
    const mockRedis = {
        store,
        hashes,
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        set: vi.fn(async (key: string, value: string) => { store.set(key, value); return 'OK' }),
        hget: vi.fn(async (key: string, field: string) => hashes.get(key)?.get(field) ?? null),
        incr: vi.fn(async (key: string) => {
            const next = Number(store.get(key) ?? '0') + 1
            store.set(key, String(next))
            return next
        }),
        del: vi.fn(async (...keys: string[]) => {
            keys.forEach((k) => { store.delete(k); hashes.delete(k) })
            return keys.length
        }),
        scan: vi.fn(),
        multi: vi.fn(multi),
    }
    return { mockRedis, mockGetRedis: vi.fn(async () => mockRedis) }
})

vi.mock('@/lib/redis', () => ({ getRedis: mockGetRedis }))

import {
    bumpCatalogVersion,
    clampMaxMissing,
    getMakeableCache,
    getRecommendationsCache,
    invalidateMakeableCache,
    makeableField,
    makeableKey,
    recommendationsKey,
    setMakeableCache,
    setRecommendationsCache,
} from '@/lib/cache/makeable-cache'
import type { MakeableCocktail } from '@/types/models/cocktail'

const cocktails = [{ id: 'c1', name: 'Negroni' }] as unknown as MakeableCocktail[]

describe('clampMaxMissing (DB-010)', () => {
    it.each([
        [null, 3],
        [undefined, 3],
        ['', 3],
        ['abc', 3],
        ['NaN', 3],
        ['Infinity', 3],
        ['-4', 0],
        ['2.9', 2],
        ['0', 0],
        ['7', 7],
        ['999', 10],
        [5, 5],
        [-1, 0],
    ])('clamps %j to %i', (raw, expected) => {
        expect(clampMaxMissing(raw)).toBe(expected)
    })

    it('always returns an integer between 0 and 10', () => {
        for (const raw of ['1e9', '-1e9', '3.14159', ' 4 ']) {
            const v = clampMaxMissing(raw)
            expect(Number.isInteger(v)).toBe(true)
            expect(v).toBeGreaterThanOrEqual(0)
            expect(v).toBeLessThanOrEqual(10)
        }
    })
})

describe('makeable cache key layout', () => {
    it('uses one key per user and a versioned field per maxMissing', () => {
        expect(makeableKey('u1')).toBe('makeable:u1')
        expect(makeableField('4', 3)).toBe('4:3')
        expect(recommendationsKey('u1')).toBe('recommendations:u1')
    })
})

describe('makeable cache behaviour', () => {
    beforeEach(() => {
        mockRedis.store.clear()
        mockRedis.hashes.clear()
        vi.clearAllMocks()
    })

    it('round-trips a value for the current catalog version', async () => {
        await setMakeableCache('u1', 3, cocktails)
        expect(await getMakeableCache('u1', 3)).toEqual(cocktails)
        expect(await getMakeableCache('u1', 2)).toBeNull()
    })

    it('invalidates a user with a direct DEL and never SCANs the keyspace', async () => {
        await setMakeableCache('u1', 3, cocktails)
        await setRecommendationsCache('u1', { neverTried: [] })

        await invalidateMakeableCache('u1')

        expect(mockRedis.scan).not.toHaveBeenCalled()
        expect(mockRedis.del).toHaveBeenCalledWith('makeable:u1', 'recommendations:u1')
        expect(await getMakeableCache('u1', 3)).toBeNull()
        expect(await getRecommendationsCache('u1')).toBeNull()
    })

    it('a catalog version bump hides entries computed for the old catalog', async () => {
        await setMakeableCache('u1', 3, cocktails)
        await setRecommendationsCache('u1', { neverTried: [] })

        await bumpCatalogVersion()

        expect(await getMakeableCache('u1', 3)).toBeNull()
        expect(await getRecommendationsCache('u1')).toBeNull()
    })

    it('is a no-op when Redis is unavailable', async () => {
        mockGetRedis.mockResolvedValueOnce(null as never)
        await expect(invalidateMakeableCache('u1')).resolves.toBeUndefined()
    })
})
