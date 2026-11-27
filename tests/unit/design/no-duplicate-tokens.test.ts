import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const declaredNames = (css: string) =>
    new Set(Array.from(css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[;{\s])(--[\w-]+)\s*:/g), (m) => m[1]))

describe('token single source', () => {
    it('globals.css declares no custom property that tokens.css also declares', () => {
        const tokens = declaredNames(readFileSync('src/styles/tokens.css', 'utf8'))
        const globals = declaredNames(readFileSync('src/app/globals.css', 'utf8'))
        const duplicates = [...globals].filter((n) => tokens.has(n))
        expect(duplicates).toEqual([])
    })
})
