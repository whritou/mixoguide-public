import Link from "next/link"
import { GlassWater } from "lucide-react"

export const metadata = {
    title: "404 – Page Not Found",
}

export default function NotFound() {
    return (
        <div className="bg-mg-cream min-h-screen flex flex-col items-center justify-center px-6 text-center">
            <div className="mb-8 w-20 h-20 rounded-full bg-mg-caramel/10 flex items-center justify-center">
                <GlassWater size={36} className="text-mg-caramel" />
            </div>

            <p className="font-label uppercase tracking-widest text-sm text-mg-caramel mb-3">
                Error 404
            </p>
            <h1 className="font-headline text-3xl lg:text-4xl text-mg-ink mb-4">
                Glass Empty
            </h1>
            <p className="font-body text-mg-charcoal text-base max-w-sm mb-10">
                The page you&apos;re looking for has been shaken, stirred, and poured down the drain.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    href="/"
                    className="px-8 py-3 bg-mg-brown text-white rounded-full font-label text-xs uppercase tracking-widest font-bold hover:bg-[#5c3f1f] transition-colors"
                >
                    Back to Home
                </Link>
                <Link
                    href="/cocktails"
                    className="px-8 py-3 border border-mg-bone text-mg-brown rounded-full font-label text-xs uppercase tracking-widest font-bold hover:bg-mg-linen transition-colors"
                >
                    Browse Cocktails
                </Link>
            </div>
        </div>
    )
}
