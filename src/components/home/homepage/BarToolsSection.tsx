'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { FlaskConical, Ruler, Flame } from 'lucide-react'

const HIGHLIGHTS = [
    {
        icon: FlaskConical,
        label: '16 Essential Tools',
        description: 'From shakers to torches — every piece of kit explained with pro tips.',
        accent: 'bg-mg-brown/10 text-mg-brown',
    },
    {
        icon: Ruler,
        label: '10 Core Techniques',
        description: 'Shaken, stirred, built, smoked, clarified — and when to use each.',
        accent: 'bg-mg-caramel/15 text-[#5c3a10]',
    },
    {
        icon: Flame,
        label: 'Pro Tips on Every Card',
        description: 'Actionable guidance so you can mix with confidence from day one.',
        accent: 'bg-mg-ink/[0.06] text-mg-ink',
    },
]

export function BarToolsSection() {
    return (
        <section className="bg-[#f0ebe3] rounded-2xl px-8 lg:px-14 py-12 lg:py-16">
            <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">

                {/* Left: text */}
                <motion.div
                    className="lg:w-2/5 shrink-0"
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    <span className="font-label uppercase tracking-[0.2em] text-mg-brown text-xs mb-3 block">
                        The Bartender&rsquo;s Reference
                    </span>
                    <h2 className="font-headline text-3xl lg:text-4xl text-mg-ink mb-4 leading-tight">
                        Master your tools &amp; techniques
                    </h2>
                    <p className="font-body text-sm text-mg-charcoal leading-relaxed mb-8">
                        Every great cocktail starts before the pour. Learn which tools to reach for,
                        how to use them, and the technique that ties it all together.
                    </p>
                    <Link
                        href="/bar-tools"
                        className="inline-flex items-center gap-2 px-8 py-3.5
                                   bg-gradient-to-br from-mg-brown to-mg-caramel
                                   text-white rounded-full
                                   font-label text-xs uppercase tracking-widest
                                   hover:scale-[0.98] transition-transform duration-200"
                    >
                        Explore the Guide
                    </Link>
                </motion.div>

                {/* Right: highlight cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:w-3/5">
                    {HIGHLIGHTS.map(({ icon: Icon, label, description, accent }, i) => (
                        <motion.div
                            key={label}
                            className="bg-white rounded-xl p-5 flex items-start gap-4 shadow-xs hover:shadow-md transition-shadow duration-300"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] as const }}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
                                <Icon size={18} />
                            </div>
                            <div>
                                <p className="font-headline text-base text-mg-ink leading-snug mb-1">{label}</p>
                                <p className="font-body text-xs text-mg-charcoal leading-relaxed">{description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
