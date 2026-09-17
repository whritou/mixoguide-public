'use client'

import Link from 'next/link'

export default function AdminSegmentError({ reset }: { reset: () => void }) {
    return (
        <div className="min-h-screen bg-mg-cream flex items-center justify-center px-4">
            <div className="max-w-md text-center">
                <p className="font-label uppercase tracking-[0.2em] text-mg-brown/60 text-xs mb-4">
                    Admin view interrupted
                </p>
                <h1 className="font-headline text-3xl text-mg-ink mb-4">
                    The admin console hit a snag
                </h1>
                <p className="font-body text-mg-ink/60 mb-8">
                    Retry this admin screen, or return to the admin dashboard without losing the rest of your session.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                    <button
                        type="button"
                        onClick={reset}
                        className="px-8 py-3 bg-mg-brown text-white rounded-full font-label text-sm uppercase tracking-widest hover:bg-mg-brown/90 transition-colors"
                    >
                        Try again
                    </button>
                    <Link
                        href="/admin"
                        className="px-8 py-3 border border-mg-ink/20 text-mg-ink rounded-full font-label text-sm uppercase tracking-widest hover:bg-mg-ink/5 transition-colors"
                    >
                        Admin home
                    </Link>
                </div>
            </div>
        </div>
    )
}
