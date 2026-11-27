'use client'
import Link from "next/link"

export default function GlobalError({
    reset,
}: {
    reset: () => void
}) {

    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <p className="font-label uppercase tracking-[0.2em] text-brand/60 text-xs mb-4">
                    Something went wrong
                </p>
                <h1 className="font-headline text-3xl text-fg mb-4">
                    An unexpected error occurred
                </h1>
                <p className="font-body text-fg/60 mb-8">
                    We&apos;ve logged the issue. You can try again or head back home.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                    <button
                        onClick={reset}
                        className="px-8 py-3 bg-brand text-fg-on-brand rounded-full font-label text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="px-8 py-3 border border-fg/20 text-fg rounded-full font-label text-sm uppercase tracking-widest hover:bg-fg/5 transition-colors"
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    )
}
