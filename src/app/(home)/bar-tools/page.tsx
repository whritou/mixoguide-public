'use client'

import { motion } from 'motion/react'
import { ToolCard } from '@/components/home/bar-tools/ToolCard'
import { TechniqueCard } from '@/components/home/bar-tools/TechniqueCard'
import { BAR_TOOLS, TECHNIQUES, containerVariants } from '@/data/bar-tools'

export default function BarToolsPage() {
    return (
        <div className="min-h-screen bg-mg-cream text-mg-ink">

            <div className="bg-gradient-to-b from-[#f0ebe3] to-mg-cream py-16 lg:py-24 px-4 md:px-12">
                <motion.div
                    className="text-center max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
                >
                    <span className="font-label uppercase tracking-[0.22em] text-mg-brown text-xs mb-4 block">
                        The Bartender&apos;s Reference
                    </span>
                    <h1 className="font-headline text-4xl lg:text-5xl text-mg-ink mb-5 leading-tight">
                        Bar Tools &amp; Techniques
                    </h1>
                    <p className="font-body text-base text-mg-charcoal leading-relaxed max-w-xl mx-auto">
                        From the tools that live on your bar top to the techniques that define every great drink —
                        everything you need to mix with confidence and precision.
                    </p>
                </motion.div>
            </div>

            <div className="px-4 md:px-12 pb-20 space-y-20 lg:space-y-28">

                <section>
                    <motion.div
                        className="text-center mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                        <span className="font-label uppercase tracking-[0.2em] text-mg-brown text-xs mb-3 block">
                            Equipment
                        </span>
                        <h2 className="font-headline text-3xl lg:text-4xl text-mg-ink">Essential Bar Tools</h2>
                        <p className="font-body text-sm text-mg-charcoal mt-3 max-w-lg mx-auto">
                            The right tool makes every step easier. Here are the essentials every home bartender should own.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-40px' }}
                    >
                        {BAR_TOOLS.map((tool) => <ToolCard key={tool.name} tool={tool} />)}
                    </motion.div>
                </section>

                <section>
                    <motion.div
                        className="text-center mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                        <span className="font-label uppercase tracking-[0.2em] text-mg-brown text-xs mb-3 block">
                            Craft
                        </span>
                        <h2 className="font-headline text-3xl lg:text-4xl text-mg-ink">Core Techniques</h2>
                        <p className="font-body text-sm text-mg-charcoal mt-3 max-w-lg mx-auto">
                            Every cocktail method has a purpose. Master these and you&apos;ll know exactly when — and why — to use each one.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-40px' }}
                    >
                        {TECHNIQUES.map((technique) => <TechniqueCard key={technique.slug} technique={technique} />)}
                    </motion.div>
                </section>

            </div>
        </div>
    )
}
