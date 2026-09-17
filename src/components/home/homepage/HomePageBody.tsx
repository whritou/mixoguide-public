'use client'

import Link from 'next/link'

import { RecommendationsSection } from '@/components/home/homepage/RecommendationsSection'
import { FeaturesSection } from '@/components/home/homepage/FeaturesSection'
import { BarToolsSection } from '@/components/home/homepage/BarToolsSection'

export function HomePageBody() {

    return (
        <div className="px-4 md:px-12 py-16 lg:py-20 space-y-20 lg:space-y-28">
            <FeaturesSection />
            <BarToolsSection />
            <RecommendationsSection />

            <section className="bg-mg-brown rounded-2xl p-8 lg:p-16 text-center">
                <span className="font-label uppercase tracking-[0.2em] text-white/60 text-xs mb-4 block">
                    Ready to begin?
                </span>
                <h2 className="font-headline text-3xl lg:text-5xl text-white mb-4">
                    Unlock Your Full Bar Experience
                </h2>
                <p className="text-white/80 font-body text-lg mb-10 max-w-xl mx-auto">
                    Sign up to track your pantry, discover cocktails you can make right now,
                    plan your evenings, and build a shopping list.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                    <Link
                        href="/signup"
                        className="px-10 py-4 bg-white text-mg-brown rounded-full font-label text-sm uppercase tracking-widest font-bold hover:bg-white/90 transition-colors"
                    >
                        Create Account
                    </Link>
                    <Link
                        href="/signin"
                        className="px-10 py-4 border border-white/30 text-white rounded-full font-label text-sm uppercase tracking-widest hover:bg-white/10 transition-colors"
                    >
                        Sign In
                    </Link>
                </div>
            </section>
        </div>
    )
}
