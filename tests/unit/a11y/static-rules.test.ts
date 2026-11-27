import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Source-level guards for the WCAG fixes (A11Y-011, A11Y-012, A11Y-020, A11Y-024).
 * Scope: shared components plus the app pages owned by the a11y pass. Feature
 * routes under src/app/(home)/{cocktails,ingredients} are covered by their own tests.
 */
function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        return statSync(p).isDirectory() ? walk(p) : /\.(tsx|ts)$/.test(name) ? [p] : []
    })
}

const FILES = [
    ...walk('src/components'),
    ...walk('src/app/(auth)').filter((f) => !f.endsWith('layout.tsx')),
    'src/app/invite/[token]/RsvpForm.tsx',
    'src/app/pantry/PantryClientView.tsx',
    'src/app/pantry/page.tsx',
    'src/app/(home)/cookie-policy/page.tsx',
    'src/app/(home)/privacy-policy/page.tsx',
    'src/app/(home)/terms-of-use/page.tsx',
]

const read = (f: string) => readFileSync(f, 'utf8')

describe('a11y static rules', () => {
    it('no low-opacity text tokens (/40–/70) that fail 4.5:1 — A11Y-011', () => {
        const LOW = /\btext-(?:fg|fg-secondary|fg-dim|fg-muted|brand|brand-soft|brand-soft-strong)\/(?:[1-6]\d|70)\b/g
        const offenders = FILES.flatMap((f) => (read(f).match(LOW) ?? []).map((m) => `${f}: ${m}`))
        expect(offenders).toEqual([])
    })

    it('focus rings are solid, not ring-ring/50 — A11Y-011/012', () => {
        const offenders = FILES.filter((f) => /\bring-ring\/\d+/.test(read(f)))
        expect(offenders).toEqual([])
        expect(read('src/app/globals.css')).not.toContain('outline-ring/50')
    })

    it('Loader and Skeleton do not import a JS animation library — PERF-004', () => {
        for (const f of ['src/components/ui/Loader.tsx', 'src/components/ui/skeleton.tsx']) {
            expect(read(f), f).not.toMatch(/from ['"](?:motion|motion\/react|framer-motion)['"]/)
        }
    })

    it('globals.css honours prefers-reduced-motion and reserves scroll padding — A11Y-015/020', () => {
        const css = read('src/app/globals.css')
        expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
        expect(css).toMatch(/scroll-padding-top/)
    })

    it('no hand-rolled fixed overlays outside ui/ — A11Y-002', () => {
        const offenders = FILES.filter(
            (f) => !f.replace(/\\/g, '/').includes('src/components/ui/') && /createPortal\(/.test(read(f)),
        )
        expect(offenders).toEqual([])
    })

    it('UI copy is English — A11Y-024', () => {
        const offenders = FILES.filter((f) => /Rechercher/.test(read(f)))
        expect(offenders).toEqual([])
    })
})
