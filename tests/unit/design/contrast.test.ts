import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseTokenBlocks } from '@/lib/design/contrast'
import { CONTRAST_PAIRS } from '@/styles/contrast-pairs'

describe('design token contrast', () => {
    it('computes WCAG ratios', () => {
        expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
        expect(contrastRatio('#81756a', '#fbf9f6')).toBeCloseTo(4.26, 1)
    })

    it.each(['light', 'dark'] as const)('every declared pair passes in %s', (theme) => {
        const blocks = parseTokenBlocks(readFileSync('src/styles/tokens.css', 'utf8'))
        for (const p of CONTRAST_PAIRS) {
            expect(blocks[theme][p.fg], `${p.fg} missing (${theme})`).toBeDefined()
            expect(blocks[theme][p.bg], `${p.bg} missing (${theme})`).toBeDefined()
            const ratio = contrastRatio(blocks[theme][p.fg], blocks[theme][p.bg])
            expect(ratio, `${p.fg} on ${p.bg} (${theme})`).toBeGreaterThanOrEqual(p.min)
        }
    })

    it('the old light fg-muted fails, proving the test bites', () => {
        expect(contrastRatio('#81756a', '#fbf9f6')).toBeLessThan(4.5)
    })
})
