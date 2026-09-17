import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string) {
    return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('planner modal layering', () => {
    it('keeps the collection details overlay full-screen above planner navigation', () => {
        const modal = source('src/components/home/planned-cocktails/card/CollectionDetailsModal.tsx')

        expect(modal).toContain('className="fixed inset-0 flex items-center justify-center overflow-hidden')
        expect(modal).toContain('style={{ zIndex: 9999 }}')
        expect(modal).toContain("style={{ maxHeight: 'calc(100vh - 2rem)' }}")
        expect(modal).toContain('className="min-h-0 flex-1 overflow-y-auto overscroll-contain')
        expect(modal).not.toContain('className="fixed inset-0 flex items-start')
        expect(modal).not.toMatch(/\b(?:top-20|bottom-24|md:top-24|md:bottom-8)\b/)
    })

    it('keeps planner custom overlays above the app bar and mobile bottom nav', () => {
        const files = [
            'src/components/home/planned-cocktails/card/ShareCollectionModal.tsx',
            'src/components/home/planned-cocktails/dialog/PlanCocktailDialog.tsx',
            'src/components/home/planned-cocktails/dialog/RescheduleDialog.tsx',
            'src/components/home/planned-cocktails/dialog/RescheduleCollectionDialog.tsx',
            'src/components/home/planned-cocktails/view/PlannerCalendarView.tsx',
        ]

        for (const file of files) {
            const contents = source(file)

            expect(contents, file).toContain('fixed inset-0 z-[160]')
            expect(contents, file).not.toMatch(/\bfixed inset-0 z-(?:40|50|60)\b/)
            expect(contents, file).not.toMatch(/\bfixed inset-0 z-\[(?:40|50|60)\]\b/)
        }
    })

    it('portals card-owned dialogs above sibling planner cards', () => {
        const rescheduleDialog = source('src/components/home/planned-cocktails/dialog/RescheduleDialog.tsx')
        const shareCollectionModal = source('src/components/home/planned-cocktails/card/ShareCollectionModal.tsx')

        expect(rescheduleDialog).toContain("import { createPortal } from 'react-dom'")
        expect(rescheduleDialog).toContain('return createPortal(')
        expect(rescheduleDialog).toContain('document.body')
        expect(rescheduleDialog).toContain('style={{ zIndex: 9999 }}')

        expect(shareCollectionModal).toContain("import { createPortal } from 'react-dom'")
        expect(shareCollectionModal).toContain('return createPortal(')
        expect(shareCollectionModal).toContain('document.body')
        expect(shareCollectionModal).toContain('style={{ zIndex: 9999 }}')
    })

    it('keeps confirm dialogs above the event details modal', () => {
        const confirmDialog = source('src/components/ui/ConfirmDialog.tsx')

        expect(confirmDialog).toContain('className="fixed inset-0 flex items-center justify-center')
        expect(confirmDialog).toContain('style={{ zIndex: 10000 }}')
    })
})
