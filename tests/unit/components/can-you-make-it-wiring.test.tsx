import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const { mockUseMakeablePreview } = vi.hoisted(() => ({ mockUseMakeablePreview: vi.fn() }))

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }))
vi.mock('@/hooks/useDemoBar', () => ({ useDemoBar: () => ({ ids: ['rum', 'lime', 'syrup'], toggle: vi.fn() }) }))
vi.mock('@/hooks/queries/useMakeablePreview', () => ({ useMakeablePreview: mockUseMakeablePreview }))

import CanYouMakeIt from '@/components/home/cocktails/CanYouMakeIt'

const daiquiri = [
    { id: 'rum', name: 'White rum', amount: 6, unit: 'cl' },
    { id: 'lime-juice', name: 'Lime Juice', amount: 3, unit: 'cl' },
    { id: 'syrup', name: 'Simple syrup', amount: 2, unit: 'cl' },
]

const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const render = () => text(renderToStaticMarkup(<CanYouMakeIt cocktailId="daiquiri" ingredients={daiquiri} />))
const preview = { makeableCount: 3, top: [], oneBottleAway: null, target: { requiredCount: 3, missing: [] } }

describe('CanYouMakeIt', () => {
    beforeEach(() => vi.clearAllMocks())

    it('asks the engine about this cocktail and trusts its target', () => {
        mockUseMakeablePreview.mockReturnValue({ data: preview, isCurrent: true })

        expect(render()).toContain('You can make it tonight.')
        expect(mockUseMakeablePreview).toHaveBeenCalledWith(['rum', 'lime', 'syrup'], 'daiquiri')
    })

    it('falls back to the ticked ids while the preview is stale', () => {
        mockUseMakeablePreview.mockReturnValue({ data: preview, isCurrent: false })

        expect(render()).toContain('You have 2 of 3. Missing: Lime Juice.')
    })
})
