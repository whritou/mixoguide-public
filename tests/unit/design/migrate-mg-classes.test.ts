import { describe, expect, it } from 'vitest'
import { migrateClasses } from '../../../scripts/design/migrate-mg-classes'

describe('migrateClasses', () => {
    it('rewrites plain classes', () => {
        expect(migrateClasses('className="text-mg-ink bg-mg-cream"').output).toBe('className="text-fg bg-canvas"')
    })

    it('preserves variant prefixes and maps ring to ring', () => {
        expect(migrateClasses('hover:bg-mg-smoke focus-visible:ring-mg-caramel').output)
            .toBe('hover:bg-surface-hover focus-visible:ring-ring')
    })

    it('preserves opacity suffixes and reports ambiguous ones', () => {
        expect(migrateClasses('bg-mg-ink/75 border-mg-caramel/25').output).toBe('bg-mg-ink/75 border-brand-soft/25')
        expect(migrateClasses('bg-mg-ink/75').ambiguous[0].token).toBe('bg-mg-ink/75')
    })

    it('maps gradient stops', () => {
        expect(migrateClasses('from-mg-brown to-mg-caramel').output).toBe('from-brand-gradient-from to-brand-gradient-to')
    })

    it('does not match inside longer identifiers', () => {
        expect(migrateClasses('text-mg-muted-foreground').output).toBe('text-mg-muted-foreground')
    })

    it('handles template literals and ternaries', () => {
        expect(migrateClasses('`${a ? "text-mg-sage" : "text-mg-rust"}`').output)
            .toBe('`${a ? "text-success" : "text-missing"}`')
    })

    it('handles object maps and cn() args', () => {
        expect(migrateClasses("{ dot: 'text-mg-sage' }, cn('md:text-mg-charcoal', x)").output)
            .toBe("{ dot: 'text-success' }, cn('md:text-fg-secondary', x)")
    })

    it('reports ambiguous tokens with line numbers and leaves them unchanged', () => {
        const r = migrateClasses('a\nb "bg-mg-sand text-mg-espresso"\nc text-mg-caramel')
        expect(r.output).toBe('a\nb "bg-mg-sand text-mg-espresso"\nc text-mg-caramel')
        expect(r.ambiguous).toEqual([
            { line: 2, token: 'bg-mg-sand' },
            { line: 2, token: 'text-mg-espresso' },
            { line: 3, token: 'text-mg-caramel' },
        ])
    })

    it('applies per-prefix overrides', () => {
        expect(migrateClasses('text-mg-amber bg-mg-amber text-mg-bone border-mg-sand').output)
            .toBe('text-warning bg-warning-accent text-line-strong border-line')
    })

    it('never touches non-mg classes', () => {
        expect(migrateClasses('text-white bg-white text-mg').output).toBe('text-white bg-white text-mg')
    })

    it('covers accent, ring-offset and directional borders', () => {
        expect(migrateClasses('accent-mg-brown border-t-mg-caramel ring-offset-mg-cream').output)
            .toBe('accent-brand border-t-brand-soft ring-offset-canvas')
    })

    it('reports arbitrary opacity as ambiguous', () => {
        const r = migrateClasses('bg-mg-ink/[0.06]')
        expect(r.output).toBe('bg-mg-ink/[0.06]')
        expect(r.ambiguous[0].token).toBe('bg-mg-ink/[0.06]')
        expect(migrateClasses('bg-mg-cream/[0.5]').output).toBe('bg-canvas/[0.5]')
    })

    it('keeps text sage/muted mapped but flags non-text uses', () => {
        expect(migrateClasses('text-mg-sage text-mg-muted').output).toBe('text-success text-fg-muted')
        const r = migrateClasses('bg-mg-sage border-mg-muted')
        expect(r.output).toBe('bg-mg-sage border-mg-muted')
        expect(r.ambiguous.map(a => a.token)).toEqual(['bg-mg-sage', 'border-mg-muted'])
    })

    it('treats directional bone borders as ambiguous', () => {
        const r = migrateClasses('border-t-mg-bone border-x-mg-bone')
        expect(r.output).toBe('border-t-mg-bone border-x-mg-bone')
        expect(r.ambiguous.map(a => a.token)).toEqual(['border-t-mg-bone', 'border-x-mg-bone'])
    })

    it('reports unknown mg-* utilities', () => {
        const src = ['a', 'text-mg-foo'].join('\n')
        const r = migrateClasses(src)
        expect(r.output).toBe(src)
        expect(r.unknown).toEqual([{ line: 2, token: 'text-mg-foo' }])
    })
})
