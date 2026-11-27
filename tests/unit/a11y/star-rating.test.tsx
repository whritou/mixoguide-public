import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import StarRating, { StarRatingDisplay, nextRatingForKey } from '@/components/StarRating'

describe('StarRating (interactive) — A11Y-001', () => {
    const html = renderToStaticMarkup(<StarRating value={3} interactive onChange={() => {}} />)

    it('renders a labelled radiogroup', () => {
        expect(html).toContain('role="radiogroup"')
        expect(html).toContain('aria-label="Your rating"')
    })

    it('renders one named radio button per star with the checked state', () => {
        const radios = html.match(/<button[^>]*role="radio"[^>]*>/g) ?? []
        expect(radios).toHaveLength(5)
        expect(html).toContain('aria-label="1 star"')
        expect(html).toContain('aria-label="4 stars"')
        const checked = radios.filter((r) => r.includes('aria-checked="true"'))
        expect(checked).toHaveLength(1)
        expect(checked[0]).toContain('aria-label="3 stars"')
    })

    it('uses a roving tabindex with the checked star as the only tab stop', () => {
        const radios = html.match(/<button[^>]*role="radio"[^>]*>/g) ?? []
        const tabbable = radios.filter((r) => r.includes('tabindex="0"'))
        expect(tabbable).toHaveLength(1)
        expect(tabbable[0]).toContain('aria-label="3 stars"')
    })

    it('makes the first star the tab stop when nothing is rated', () => {
        const empty = renderToStaticMarkup(<StarRating value={0} interactive onChange={() => {}} />)
        const tabbable = (empty.match(/<button[^>]*role="radio"[^>]*>/g) ?? []).filter((r) => r.includes('tabindex="0"'))
        expect(tabbable).toHaveLength(1)
        expect(tabbable[0]).toContain('aria-label="1 star"')
    })

    it('gives every star a target of at least 24px and hides the glyphs', () => {
        const radios = html.match(/<button[^>]*role="radio"[^>]*>/g) ?? []
        for (const r of radios) expect(r).toMatch(/min-h-6 min-w-6/)
        expect(html).not.toMatch(/<svg(?![^>]*aria-hidden="true")[^>]*>/)
    })

    it('accepts a custom group label', () => {
        expect(renderToStaticMarkup(<StarRating value={0} interactive label="Rate the Negroni" />)).toContain(
            'aria-label="Rate the Negroni"',
        )
    })
})

describe('nextRatingForKey — radio group keyboard model', () => {
    it.each([
        ['ArrowRight', 3, 4],
        ['ArrowUp', 3, 4],
        ['ArrowLeft', 3, 2],
        ['ArrowDown', 3, 2],
        ['ArrowRight', 5, 1],
        ['ArrowLeft', 1, 5],
        ['Home', 4, 1],
        ['End', 2, 5],
    ] as const)('%s from %i selects %i', (key, from, to) => {
        expect(nextRatingForKey(key, from, 5)).toBe(to)
    })

    it('ignores other keys (Tab, letters) so focus can leave the group', () => {
        expect(nextRatingForKey('Tab', 3, 5)).toBeNull()
        expect(nextRatingForKey('a', 3, 5)).toBeNull()
    })
})

describe('StarRating (display) — role="img" text alternative', () => {
    it('exposes the average as an image label, not as five unlabelled svgs', () => {
        const html = renderToStaticMarkup(<StarRating value={3.5} />)
        expect(html).toContain('role="img"')
        expect(html).toContain('aria-label="Rated 3.5 out of 5"')
        expect(html).not.toContain('role="radio"')
    })

    it('StarRatingDisplay announces the rating count as words', () => {
        const html = renderToStaticMarkup(<StarRatingDisplay avg={4.2} count={12} />)
        expect(html).toContain('aria-label="Rated 4.2 out of 5"')
        expect(html).toContain('12<span class="sr-only"> ratings</span>')
    })
})
