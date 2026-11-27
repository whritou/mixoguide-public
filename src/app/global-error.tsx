'use client'

import { useEffect } from 'react'
import './globals.css'
import { reportError } from '@/utils/reportError'

/**
 * Replaces the root layout when it (or a provider in it) throws, so it must
 * render its own <html>/<body> and cannot rely on providers, fonts or the
 * theme script. Keep it dependency-free.
 */
export default function GlobalError({
    error,
    unstable_retry,
}: {
    error: Error & { digest?: string }
    unstable_retry: () => void
}) {
    useEffect(() => {
        reportError(error, 'global')
    }, [error])

    return (
        <html lang="en">
            <body className="antialiased">
                <title>Something went wrong | MixoGuide</title>
                <main id="main" className="min-h-screen bg-canvas flex items-center justify-center px-4">
                    <div role="alert" className="text-center max-w-md">
                        <p className="uppercase tracking-[0.2em] text-brand-soft-strong text-xs mb-4">
                            Something went wrong
                        </p>
                        <h1 className="text-3xl text-fg mb-4">MixoGuide could not load</h1>
                        <p className="text-fg-secondary mb-8">
                            Please try again. If the problem persists, reload the page.
                        </p>
                        {error.digest && (
                            <p className="font-mono text-xs text-fg-muted mb-6">Reference: {error.digest}</p>
                        )}
                        <div className="flex gap-4 justify-center flex-wrap">
                            <button
                                type="button"
                                onClick={() => unstable_retry()}
                                className="px-8 py-3 bg-brand text-fg-on-brand rounded-full text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors"
                            >
                                Try again
                            </button>
                            {/* Plain anchor: a full reload is the safest recovery when the root layout failed. */}
                            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                            <a
                                href="/"
                                className="px-8 py-3 border border-fg/20 text-fg rounded-full text-sm uppercase tracking-widest hover:bg-fg/5 transition-colors"
                            >
                                Go home
                            </a>
                        </div>
                    </div>
                </main>
            </body>
        </html>
    )
}
