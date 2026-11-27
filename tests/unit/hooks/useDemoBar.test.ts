import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearDemoBar, persistDisplayedBar, readDemoBar, writeDemoBar } from '@/lib/demo-bar/storage'

function installStorage(initial: Record<string, string> = {}) {
    const store = new Map(Object.entries(initial))
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => void store.set(k, v),
            removeItem: (k: string) => void store.delete(k),
        },
    })
    return store
}

describe('demo bar storage', () => {
    beforeEach(() => installStorage())
    afterEach(() => {
        Reflect.deleteProperty(globalThis, 'localStorage')
    })

    it('round-trips ids under mg:demo-bar', () => {
        const store = installStorage()
        writeDemoBar(['a', 'b'])
        expect(store.get('mg:demo-bar')).toBe('["a","b"]')
        expect(readDemoBar()).toEqual(['a', 'b'])
    })

    it('clears the bar', () => {
        writeDemoBar(['a'])
        clearDemoBar()
        expect(readDemoBar()).toEqual([])
    })

    it('returns [] for malformed JSON', () => {
        installStorage({ 'mg:demo-bar': '{nope' })
        expect(readDemoBar()).toEqual([])
    })

    it('returns [] for a non-array value', () => {
        installStorage({ 'mg:demo-bar': '{"a":1}' })
        expect(readDemoBar()).toEqual([])
    })

    it('drops non-string entries', () => {
        installStorage({ 'mg:demo-bar': '["a",1,null,"b",{}]' })
        expect(readDemoBar()).toEqual(['a', 'b'])
    })

    it('drops empty strings and ids longer than 64 characters', () => {
        installStorage({ 'mg:demo-bar': JSON.stringify(['a', '', 'x'.repeat(65), 'y'.repeat(64)]) })
        expect(readDemoBar()).toEqual(['a', 'y'.repeat(64)])
    })

    it('truncates to 40 entries on read and write', () => {
        const ids = Array.from({ length: 50 }, (_, i) => `id${i}`)
        installStorage({ 'mg:demo-bar': JSON.stringify(ids) })
        expect(readDemoBar()).toHaveLength(40)
        writeDemoBar(ids)
        expect(readDemoBar()).toHaveLength(40)
    })

    it('does not throw when localStorage throws', () => {
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            get() { throw new Error('denied') },
        })
        expect(readDemoBar()).toEqual([])
        expect(() => writeDemoBar(['a'])).not.toThrow()
        expect(() => clearDemoBar()).not.toThrow()
    })
})

describe('persistDisplayedBar', () => {
    afterEach(() => {
        Reflect.deleteProperty(globalThis, 'localStorage')
    })

    it('writes the displayed example bar when storage is empty', () => {
        const store = installStorage()
        persistDisplayedBar(['gin', 'lime'])
        expect(store.get('mg:demo-bar')).toBe('["gin","lime"]')
    })

    it('replaces the stored bar with a displayed shared bar', () => {
        installStorage({ 'mg:demo-bar': '["vodka"]' })
        persistDisplayedBar(['rum', 'mint'])
        expect(readDemoBar()).toEqual(['rum', 'mint'])
    })

    it('leaves the stored bar alone when it is the one displayed', () => {
        const store = installStorage({ 'mg:demo-bar': '["lime","gin"]' })
        persistDisplayedBar(['gin', 'lime'])
        expect(store.get('mg:demo-bar')).toBe('["lime","gin"]')
    })

    it('writes nothing for an empty bar', () => {
        const store = installStorage()
        persistDisplayedBar([])
        expect(store.has('mg:demo-bar')).toBe(false)
    })
})
