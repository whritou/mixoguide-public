'use client'
import Link from "next/link"

export default function GlobalError({
    reset,
}: {
    reset: () => void
}) {

    return (
        <div className="min-h-screen bg-mg-cream flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <p className="font-label uppercase tracking-[0.2em] text-mg-brown/60 text-xs mb-4">
                    Something went wrong
                </p>
                <h1 className="font-headline text-3xl text-mg-ink mb-4">
                    An unexpected error occurred
                </h1>
                <p className="font-body text-mg-ink/60 mb-8">
                    We&apos;ve logged the issue. You can try again or head back home.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                    <button
                        onClick={reset}
                        className="px-8 py-3 bg-mg-brown text-white rounded-full font-label text-sm uppercase tracking-widest hover:bg-mg-brown/90 transition-colors"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="px-8 py-3 border border-mg-ink/20 text-mg-ink rounded-full font-label text-sm uppercase tracking-widest hover:bg-mg-ink/5 transition-colors"
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    )
}
