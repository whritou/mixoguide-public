'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!mounted) return null

    return createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-mg-ink/50 backdrop-blur-sm cursor-default"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="w-full max-w-sm bg-mg-cream rounded-2xl shadow-2xl p-6 flex flex-col gap-4 cursor-default">
                <h3 className="font-headline text-lg text-mg-ink">{title}</h3>
                {description && (
                    <p className="text-sm text-mg-muted">{description}</p>
                )}
                {detail}
                <div className="flex gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-mg-sand/60 text-mg-charcoal hover:bg-mg-sand transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full text-white transition-colors ${
                            dangerous
                                ? 'bg-mg-danger hover:bg-mg-danger/80'
                                : 'bg-mg-brown hover:bg-mg-brown/80'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    )
}
