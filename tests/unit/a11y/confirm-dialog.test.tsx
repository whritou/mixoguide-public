import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Radix portals render nothing during SSR, so stand the dialog primitives in
// with plain elements and capture the props ConfirmDialog passes to them.
const captured: { content?: Record<string, unknown>; root?: Record<string, unknown> } = {}

vi.mock('@/components/ui/dialog', () => ({
    Dialog: (props: { children: React.ReactNode } & Record<string, unknown>) => {
        captured.root = props
        return <div data-dialog-root>{props.children}</div>
    },
    DialogContent: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
        captured.content = props
        return (
            <div role={props.role as string} data-content>
                {children}
            </div>
        )
    },
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

describe('ConfirmDialog — A11Y-002 / A11Y-018', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    const html = renderToStaticMarkup(
        <ConfirmDialog title="Delete item?" description="This cannot be undone." onCancel={onCancel} onConfirm={onConfirm} />,
    )

    it('uses alertdialog semantics with a real title and description', () => {
        expect(captured.content?.role).toBe('alertdialog')
        expect(html).toContain('role="alertdialog"')
        expect(html).toContain('<h2>Delete item?</h2>')
        expect(html).toContain('<p>This cannot be undone.</p>')
    })

    it('stacks above other modals (z-[10000]) and hides the generic close button', () => {
        expect(String(captured.content?.className)).toContain('z-[10000]')
        expect(String(captured.content?.overlayClassName)).toContain('z-[10000]')
        expect(captured.content?.showCloseButton).toBe(false)
    })

    it('renders Cancel before the destructive action', () => {
        expect(html.indexOf('Cancel')).toBeLessThan(html.indexOf('Delete<'))
    })

    it('moves initial focus to Cancel instead of the first focusable', () => {
        const preventDefault = vi.fn()
        const onOpenAutoFocus = captured.content?.onOpenAutoFocus as (e: { preventDefault: () => void }) => void
        expect(typeof onOpenAutoFocus).toBe('function')
        onOpenAutoFocus({ preventDefault })
        expect(preventDefault).toHaveBeenCalled()
    })

    it('does not dismiss on an outside click', () => {
        const preventDefault = vi.fn()
        ;(captured.content?.onPointerDownOutside as (e: { preventDefault: () => void }) => void)({ preventDefault })
        expect(preventDefault).toHaveBeenCalled()
    })

    it('Escape / close maps to onCancel', () => {
        ;(captured.root?.onOpenChange as (open: boolean) => void)(false)
        expect(onCancel).toHaveBeenCalledTimes(1)
        expect(onConfirm).not.toHaveBeenCalled()
    })
})
