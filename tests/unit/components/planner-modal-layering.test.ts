import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string) {
    return readFileSync(resolve(process.cwd(), path), 'utf8')
}

/** Extracts the numeric z-index from the first `<DialogContent … className="… z-[N] …">`. */
function dialogContentZ(contents: string): number {
    const m = /<DialogContent[\s\S]*?className="[^"]*\bz-\[(\d+)\]/.exec(contents)
    if (!m) throw new Error('No DialogContent with a z-[N] class found')
    return Number(m[1])
}

function overlayZ(contents: string): number {
    const m = /overlayClassName="[^"]*\bz-\[(\d+)\]/.exec(contents)
    if (!m) throw new Error('No overlayClassName with a z-[N] class found')
    return Number(m[1])
}

const APP_BAR_Z = 150 // dialog default; app bar / mobile nav sit below this

const PLANNER_DIALOGS = [
    'src/components/home/planned-cocktails/card/CollectionDetailsModal.tsx',
    'src/components/home/planned-cocktails/card/ShareCollectionModal.tsx',
    'src/components/home/planned-cocktails/dialog/PlanCocktailDialog.tsx',
    'src/components/home/planned-cocktails/dialog/RescheduleDialog.tsx',
    'src/components/home/planned-cocktails/dialog/RescheduleCollectionDialog.tsx',
    'src/components/home/planned-cocktails/view/PlannerCalendarView.tsx',
]

describe('planner modal layering (Radix Dialog)', () => {
    it('uses the shared Radix Dialog instead of hand-rolled fixed overlays', () => {
        for (const file of PLANNER_DIALOGS) {
            const contents = source(file)
            expect(contents, file).toMatch(/from '@\/components\/ui\/dialog'/)
            expect(contents, file).toContain('<DialogContent')
            expect(contents, file).toContain('<DialogTitle')
            expect(contents, file).not.toMatch(/className="fixed inset-0/)
            expect(contents, file).not.toContain("from 'react-dom'")
        }
    })

    it('keeps planner dialogs above the app bar and mobile bottom nav', () => {
        for (const file of PLANNER_DIALOGS) {
            const contents = source(file)
            expect(dialogContentZ(contents), file).toBeGreaterThan(APP_BAR_Z)
            expect(overlayZ(contents), file).toBe(dialogContentZ(contents))
        }
    })

    it('keeps card-owned dialogs above sibling planner cards and the details modal', () => {
        const details = dialogContentZ(source('src/components/home/planned-cocktails/card/CollectionDetailsModal.tsx'))
        expect(details).toBe(9999)
        expect(dialogContentZ(source('src/components/home/planned-cocktails/dialog/RescheduleDialog.tsx'))).toBeGreaterThanOrEqual(details)
        expect(dialogContentZ(source('src/components/home/planned-cocktails/card/ShareCollectionModal.tsx'))).toBeGreaterThanOrEqual(details)
    })

    it('keeps the collection details modal height-bounded with an inner scroll container', () => {
        const modal = source('src/components/home/planned-cocktails/card/CollectionDetailsModal.tsx')
        expect(modal).toContain("style={{ maxHeight: 'calc(100vh - 2rem)' }}")
        expect(modal).toContain('className="min-h-0 flex-1 overflow-y-auto overscroll-contain')
        expect(modal).not.toMatch(/\b(?:top-20|bottom-24|md:top-24|md:bottom-8)\b/)
    })

    it('renders confirm dialogs as alertdialogs above the event details modal', () => {
        const confirmDialog = source('src/components/ui/ConfirmDialog.tsx')
        expect(confirmDialog).toContain('role="alertdialog"')
        expect(dialogContentZ(confirmDialog)).toBe(10000)
        expect(overlayZ(confirmDialog)).toBe(10000)
        expect(dialogContentZ(confirmDialog)).toBeGreaterThan(
            dialogContentZ(source('src/components/home/planned-cocktails/card/CollectionDetailsModal.tsx')),
        )
    })
})
