import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseTokenBlocks } from '@/lib/design/contrast'
import { DESIGN_TOKENS } from '@/styles/token-list'

const css = readFileSync('src/styles/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const blockBody = (selector: string) =>
    Array.from(css.matchAll(new RegExp(`(?:^|(?<=\\}))\\s*${selector}\\s*\\{([^}]*)\\}`, 'g')), (m) => m[1]).join('\n')
const declares = (body: string, name: string) => new RegExp(`--${name}\\s*:`).test(body)

describe('DESIGN_TOKENS', () => {
    const light = blockBody(':root,\\s*\\.light')
    const dark = blockBody('\\.dark')
    const parsed = parseTokenBlocks(css)

    it('has unique names and a role for each', () => {
        const names = DESIGN_TOKENS.map((t) => t.name)
        expect(names.length).toBeGreaterThan(0)
        expect(new Set(names).size).toBe(names.length)
        for (const t of DESIGN_TOKENS) expect(t.role.length, t.name).toBeGreaterThan(0)
    })

    it.each(DESIGN_TOKENS.map((t) => t.name))('%s is declared in both theme blocks', (name) => {
        expect(declares(light, name), `${name} missing in :root`).toBe(true)
        expect(declares(dark, name), `${name} missing in .dark`).toBe(true)
    })

    it('hex tokens are parsed in both blocks', () => {
        expect(parsed.light.canvas).toBeDefined()
        expect(parsed.dark.canvas).toBeDefined()
    })
})
