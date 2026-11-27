import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }))

import { CanYouMakeItView } from '@/components/home/cocktails/CanYouMakeItView'
import {
    deriveCanMakeState,
    joinNames,
    type CanYouMakeItIngredient,
} from '@/components/home/cocktails/can-you-make-it-state'

const negroni: CanYouMakeItIngredient[] = [
    { id: 'gin', name: 'Gin', amount: 30, unit: 'ml' },
    { id: 'campari', name: 'Campari', amount: 30, unit: 'ml' },
    { id: 'vermouth', name: 'Sweet vermouth', amount: 30, unit: 'ml' },
]

const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

function render(ingredients: CanYouMakeItIngredient[], ids: string[], makeableCount?: number) {
    const state = deriveCanMakeState(ingredients, ids, makeableCount === undefined ? undefined : { makeableCount })
    return renderToStaticMarkup(
        <CanYouMakeItView ingredients={ingredients} ids={ids} state={state} onToggle={() => {}} />,
    )
}

describe('joinNames', () => {
    it('joins with commas and a final and', () => {
        expect(joinNames(['Campari'])).toBe('Campari')
        expect(joinNames(['Campari', 'sweet vermouth'])).toBe('Campari and sweet vermouth')
        expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C')
    })
})

describe('deriveCanMakeState', () => {
    it('is empty when nothing is ticked', () => {
        expect(deriveCanMakeState(negroni, [])).toMatchObject({ status: 'empty', have: 0, total: 3 })
    })

    it('lists missing required ingredients', () => {
        expect(deriveCanMakeState(negroni, ['gin', 'vermouth'])).toMatchObject({
            status: 'partial',
            have: 2,
            total: 3,
            missing: ['Campari'],
        })
    })

    it('is ready when every required ingredient is ticked', () => {
        expect(deriveCanMakeState(negroni, ['gin', 'campari', 'vermouth'])).toMatchObject({ status: 'ready', missing: [] })
    })

    it('ignores optional and garnish ingredients as the matching engine does', () => {
        const withExtras: CanYouMakeItIngredient[] = [
            ...negroni,
            { id: 'bitters', name: 'Bitters', amount: 1, unit: 'dash', optional: true },
            { id: 'orange', name: 'Orange twist', amount: 1, unit: 'twist' },
            { id: 'cherry', name: 'Cherry', amount: null },
        ]
        const state = deriveCanMakeState(withExtras, ['gin', 'campari', 'vermouth'])
        expect(state).toMatchObject({ status: 'ready', have: 3, total: 3 })
    })

    it('uses the engine target over the ticked ids when present (Lime covers Lime Juice)', () => {
        const daiquiri: CanYouMakeItIngredient[] = [
            { id: 'rum', name: 'White rum', amount: 6, unit: 'cl' },
            { id: 'lime-juice', name: 'Lime Juice', amount: 3, unit: 'cl' },
            { id: 'syrup', name: 'Simple syrup', amount: 2, unit: 'cl' },
        ]
        expect(deriveCanMakeState(daiquiri, ['rum', 'lime', 'syrup'])).toMatchObject({ status: 'partial', missing: ['Lime Juice'] })
        const state = deriveCanMakeState(daiquiri, ['rum', 'lime', 'syrup'], {
            makeableCount: 5,
            target: { requiredCount: 3, missing: [] },
        })
        expect(state).toMatchObject({ status: 'ready', have: 3, total: 3, missing: [], alsoCount: 4 })
    })

    it('takes have and missing from the target', () => {
        const state = deriveCanMakeState(negroni, ['gin'], {
            makeableCount: 0,
            target: { requiredCount: 3, missing: [{ id: 'campari', name: 'Campari' }, { id: 'vermouth', name: 'Sweet vermouth' }] },
        })
        expect(state).toMatchObject({ status: 'partial', have: 1, total: 3, missing: ['Campari', 'Sweet vermouth'] })
    })

    it('falls back to the ticked ids when the target is null', () => {
        expect(deriveCanMakeState(negroni, ['gin'], { makeableCount: 0, target: null })).toMatchObject({ have: 1, total: 3 })
    })

    it('never says ready for a recipe without required ingredients', () => {
        const garnishOnly: CanYouMakeItIngredient[] = [{ id: 'cherry', name: 'Cherry', amount: null }]
        expect(deriveCanMakeState(garnishOnly, ['cherry']).status).toBe('empty')
        expect(deriveCanMakeState(garnishOnly, ['gin'], { makeableCount: 2, target: { requiredCount: 0, missing: [] } })).toMatchObject({
            status: 'empty',
            alsoCount: 2,
        })
        expect(text(render(garnishOnly, ['cherry']))).not.toContain('You can make it tonight.')
    })

    it('subtracts this cocktail from the also-count only when fully covered', () => {
        expect(deriveCanMakeState(negroni, ['gin', 'campari', 'vermouth'], { makeableCount: 4 }).alsoCount).toBe(3)
        expect(deriveCanMakeState(negroni, ['gin'], { makeableCount: 4 }).alsoCount).toBe(4)
        expect(deriveCanMakeState(negroni, ['gin', 'campari', 'vermouth'], { makeableCount: 1 }).alsoCount).toBe(0)
        expect(deriveCanMakeState(negroni, ['gin'], undefined).alsoCount).toBe(0)
    })
})

describe('CanYouMakeItView', () => {
    it('renders a labelled checkbox per ingredient, pre-checked from the stored bar', () => {
        const html = render(negroni, ['gin', 'vermouth'])
        expect(html.match(/type="checkbox"/g)).toHaveLength(3)
        expect(html).toMatch(/<input[^>]*id="cymi-gin"[^>]*checked=""/)
        expect(html).not.toMatch(/<input[^>]*id="cymi-campari"[^>]*checked=""/)
        expect(html).toContain('for="cymi-campari"')
    })

    it('prompts when nothing is ticked', () => {
        expect(text(render(negroni, []))).toContain('Tick what you have at home.')
    })

    it('shows the partial result', () => {
        expect(text(render(negroni, ['gin', 'vermouth']))).toContain('You have 2 of 3. Missing: Campari.')
    })

    it('shows the ready result', () => {
        expect(text(render(negroni, ['gin', 'campari', 'vermouth']))).toContain('You can make it tonight.')
    })

    it('announces results politely', () => {
        expect(render(negroni, ['gin'])).toContain('aria-live="polite"')
    })

    it('labels optional ingredients', () => {
        const html = render([...negroni, { id: 'bitters', name: 'Bitters', amount: 1, unit: 'dash', optional: true }], [])
        expect(text(html)).toContain('Bitters (optional)')
        expect(text(html)).not.toContain('Gin (optional)')
    })

    it('shows the also-count with plural and singular copy, and hides it at zero', () => {
        expect(text(render(negroni, ['gin'], 12))).toContain('With these you can also make 12 cocktails')
        expect(text(render(negroni, ['gin'], 1))).toContain('With these you can also make 1 cocktail')
        expect(text(render(negroni, ['gin'], 1))).not.toContain('1 cocktails')
        expect(text(render(negroni, ['gin', 'campari', 'vermouth'], 1))).not.toContain('can also make')
        expect(text(render(negroni, ['gin'], 0))).not.toContain('can also make')
    })

    it('includes SaveMyBar', () => {
        const out = text(render(negroni, ['gin']))
        expect(out).toContain('Save my bar with Google')
        expect(out).toContain('Use email instead')
    })
})
