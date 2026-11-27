import Link from "next/link"
import { GlassWater } from "lucide-react"

export const metadata = {
    title: "404 – Page Not Found",
}

export default function NotFound() {
    return (
        <div className="bg-canvas min-h-screen flex flex-col items-center justify-center px-6 text-center">
            <div className="mb-8 w-20 h-20 rounded-full bg-brand-soft/10 flex items-center justify-center">
                <GlassWater size={36} className="text-brand-soft" />
            </div>

            <p className="font-label uppercase tracking-widest text-sm text-brand-soft-strong mb-3">
                Error 404
            </p>
            <h1 className="font-headline text-3xl lg:text-4xl text-fg mb-4">
                Glass Empty
            </h1>
            <p className="font-body text-fg-secondary text-base max-w-sm mb-10">
                The page you&apos;re looking for has been shaken, stirred, and poured down the drain.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    href="/"
                    className="px-8 py-3 bg-brand text-fg-on-brand rounded-full font-label text-xs uppercase tracking-widest font-bold hover:bg-brand/90 transition-colors"
                >
                    Back to Home
                </Link>
                <Link
                    href="/cocktails"
                    className="px-8 py-3 border border-line-strong text-brand rounded-full font-label text-xs uppercase tracking-widest font-bold hover:bg-surface-subtle transition-colors"
                >
                    Browse Cocktails
                </Link>
            </div>
        </div>
    )
}
