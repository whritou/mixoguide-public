'use client'

import Link from 'next/link'

export default function HomeSegmentError({ reset }: { reset: () => void }) {
    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
            <div className="max-w-md text-center">
                <p className="font-label uppercase tracking-[0.2em] text-brand/60 text-xs mb-4">
                    Home view interrupted
                </p>
                <h1 className="font-headline text-3xl text-fg mb-4">
                    Something spilled behind the bar
                </h1>
                <p className="font-body text-fg/60 mb-8">
                    Try reloading this section, or head back to the dashboard while we keep the rest of the app steady.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                    <button
                        type="button"
                        onClick={reset}
                        className="px-8 py-3 bg-brand text-fg-on-brand rounded-full font-label text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="px-8 py-3 border border-fg/20 text-fg rounded-full font-label text-sm uppercase tracking-widest hover:bg-fg/5 transition-colors"
                    >
                        Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}
