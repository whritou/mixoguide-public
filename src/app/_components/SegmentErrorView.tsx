'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { reportError } from '@/utils/reportError'

interface SegmentErrorViewProps {
    error: Error & { digest?: string }
    /** Re-fetches and re-renders the segment (Next 16 `unstable_retry`). */
    retry: () => void
    /** Context passed to reportError, e.g. 'planner'. */
    segment: string
    eyebrow: string
    heading: string
    body: string
    homeHref: string
    homeLabel: string
}

/** Shared body for route-segment `error.tsx` boundaries. Reports the error once per error instance. */
export function SegmentErrorView({
    error,
    retry,
    segment,
    eyebrow,
    heading,
    body,
    homeHref,
    homeLabel,
}: SegmentErrorViewProps) {
    useEffect(() => {
        reportError(error, segment)
    }, [error, segment])

    return (
        <div role="alert" className="min-h-screen bg-canvas flex items-center justify-center px-4">
            <div className="max-w-md text-center">
                <p className="font-label uppercase tracking-[0.2em] text-brand-soft-strong text-xs mb-4">
                    {eyebrow}
                </p>
                <h1 className="font-headline text-3xl text-fg mb-4">{heading}</h1>
                <p className="font-body text-fg-secondary mb-8">{body}</p>
                {error.digest && (
                    <p className="font-mono text-xs text-fg-muted mb-6">Reference: {error.digest}</p>
                )}
                <div className="flex gap-4 justify-center flex-wrap">
                    <button
                        type="button"
                        onClick={retry}
                        className="px-8 py-3 bg-brand text-fg-on-brand rounded-full font-label text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors"
                    >
                        Try again
                    </button>
                    <Link
                        href={homeHref}
                        className="px-8 py-3 border border-fg/20 text-fg rounded-full font-label text-sm uppercase tracking-widest hover:bg-fg/5 transition-colors"
                    >
                        {homeLabel}
                    </Link>
                </div>
            </div>
        </div>
    )
}
