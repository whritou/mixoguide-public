'use client'

import { useRef, type ReactNode } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog'

interface Props {
    title: string
    description?: string
    detail?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    dangerous?: boolean
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Confirmation prompt with WAI-ARIA alertdialog semantics, built on the Radix
 * Dialog primitive: focus is trapped, initial focus lands on Cancel (the safe
 * action), Escape cancels, focus returns to the trigger on close, and clicking
 * the backdrop does not dismiss it.
 *
 * Rendered above every other modal (z-[10000]) because it is opened from inside
 * planner/pantry dialogs.
 */
export function ConfirmDialog({
    title,
    description,
    detail,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    dangerous = true,
    onConfirm,
    onCancel,
}: Props) {
    const cancelRef = useRef<HTMLButtonElement>(null)

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onCancel()
            }}
        >
            <DialogContent
                role="alertdialog"
                showCloseButton={false}
                overlayClassName="z-[10000] backdrop-blur-sm"
                className="z-[10000] w-full max-w-sm bg-canvas rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border-0"
                onOpenAutoFocus={(e) => {
                    e.preventDefault()
                    cancelRef.current?.focus()
                }}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
                {...(description ? {} : { 'aria-describedby': undefined })}
            >
                <DialogTitle className="font-headline text-lg font-normal leading-snug text-fg">
                    {title}
                </DialogTitle>
                {description && (
                    <DialogDescription className="text-sm text-fg-muted">
                        {description}
                    </DialogDescription>
                )}
                {detail}
                <div className="flex gap-3 pt-1">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        className="flex-1 min-h-10 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-line text-fg-secondary hover:bg-line-strong transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`flex-1 min-h-10 py-2.5 text-xs font-label uppercase tracking-widest rounded-full text-fg-on-brand transition-colors ${
                            dangerous
                                ? 'bg-danger hover:bg-danger/90'
                                : 'bg-brand hover:bg-brand/90'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
