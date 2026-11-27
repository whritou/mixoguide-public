import { describe, expect, it } from 'vitest'
import { decodeBarParam, encodeBarParam } from '@/lib/demo-bar/bar-param'

describe('bar param', () => {
    it('round-trips ids', () => {
        expect(decodeBarParam(encodeBarParam(['b', 'a', 'c'])).sort()).toEqual(['a', 'b', 'c'])
    })

    it('is order-insensitive and dedupes', () => {
        expect(encodeBarParam(['a', 'b', 'a'])).toBe(encodeBarParam(['b', 'a']))
    })

    it('is url-safe', () => {
        expect(encodeBarParam(['???>>>', '~~~~'])).toMatch(/^[A-Za-z0-9_-]*$/)
    })

    it('returns [] for garbage, empty and nullish input', () => {
        expect(decodeBarParam('%%%')).toEqual([])
        expect(decodeBarParam('')).toEqual([])
        expect(decodeBarParam(null)).toEqual([])
        expect(decodeBarParam(undefined)).toEqual([])
    })

    it('returns [] for an over-long param', () => {
        expect(decodeBarParam('a'.repeat(3000))).toEqual([])
    })

    it('caps at 40 ids', () => {
        const ids = Array.from({ length: 50 }, (_, i) => `id${i}`)
        expect(decodeBarParam(encodeBarParam(ids))).toHaveLength(40)
    })

    it('drops ids longer than 64 characters', () => {
        const long = 'x'.repeat(65)
        expect(decodeBarParam(encodeBarParam(['gin', long, 'y'.repeat(64)])).sort()).toEqual(['gin', 'y'.repeat(64)])
    })

    it('drops duplicates and empty strings', () => {
        const param = btoa('a..b.a.').replace(/=+$/, '')
        expect(decodeBarParam(param)).toEqual(['a', 'b'])
    })
})
