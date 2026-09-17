'use client'

import { ShoppingBasket, Sparkles, CalendarDays } from "lucide-react"
import Link from "next/link"
import { motion } from "motion/react"

const FEATURES = [
    {
        icon: ShoppingBasket,
        title: 'Track Your Pantry',
        description:
            "Log every bottle and ingredient in your home bar. MixoGuide keeps track of what you have, what's running low, and what to restock.",
        cta: { label: 'See How', href: '/signup' },
        accent: 'bg-mg-brown/10 text-mg-brown',
    },
    {
        icon: Sparkles,
        title: 'Discover What You Can Make',
        description:
            'Instantly see every cocktail within reach based on your current pantry — no more guessing or cross-referencing recipes manually.',
        cta: { label: 'Explore Cocktails', href: '/cocktails' },
        accent: 'bg-mg-caramel/15 text-[#5c3a10]',
    },
    {
        icon: CalendarDays,
        title: 'Plan Your Evening',
        description:
            'Build a cocktail menu for the night, invite guests, and let MixoGuide auto-decrement your pantry as you serve each drink.',
        cta: { label: 'Get Started', href: '/signup' },
        accent: 'bg-mg-ink/[0.06] text-mg-ink',
    },
]

export function FeaturesSection() {
    return (
        <section>
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as const }}
            >
                <span className="font-label uppercase tracking-[0.2em] text-mg-brown text-xs mb-3 block">
                    Why MixoGuide
                </span>
                <h2 className="font-headline text-3xl lg:text-4xl text-mg-ink">
                    Your personal bar — elevated
                </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {FEATURES.map(({ icon: Icon, title, description, cta, accent }, i) => (
                    <motion.div
                        key={title}
                        className="bg-white rounded-2xl p-8 flex flex-col gap-5 shadow-sm hover:shadow-md transition-shadow duration-300"
                        initial={{ opacity: 0, y: 32 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.55, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] as const }}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}>
                            <Icon size={22} />
                        </div>
                        <div>
                            <h3 className="font-headline text-xl text-mg-ink mb-2">{title}</h3>
                            <p className="text-mg-charcoal font-body text-sm leading-relaxed">{description}</p>
                        </div>
                        <Link href={cta.href}
                              className="mt-auto text-mg-brown font-label text-xs uppercase tracking-widest font-bold hover:underline">
                            {cta.label} →
                        </Link>
                    </motion.div>
                ))}
            </div>
        </section>
    )
}
