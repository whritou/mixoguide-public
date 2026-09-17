'use client'

import Link from "next/link"
import Image from "next/image"
import { motion } from "motion/react"

/* ── Animated gradient background ───────────────────────────── */
function AnimatedBackground() {
    return (
        <div className="absolute inset-0 z-0 hero-gradient-animated">
            <div className="absolute inset-0 bg-gradient-to-r from-mg-ink/75 via-mg-ink/50 to-transparent" />
        </div>
    )
}

/* ── Motion variants ─────────────────────────────────────────── */
const textContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.13 } },
}
const textItem = {
    hidden: { opacity: 0, y: 28 },
    show : { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const }},
}

/* ── Cocktail images ── */
const cocktailImage = [
    {
        src: '/hero.jpg',
    },
    {
        src: '/hero2.jpg',
    },
    {
        src: '/hero3.jpg',
    }
];

/* ── Hero image grid ─────────────────────────────────────────── */
function HeroImageGrid() {
    return (
        <div className="hidden lg:flex gap-3 flex-shrink-0 w-64 xl:w-125 h-[400px] xl:h-[440px]">
            {/* Left column: one tall image */}
            <div className="flex-1 relative rounded-2xl overflow-hidden">
                <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
                >
                    <Image
                        src={cocktailImage[0].src || '/placeholder.svg'}
                        alt={"Cocktail Image"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1280px) 300px, 300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                </motion.div>
            </div>

            {/* Right column: two stacked images */}
            <div className="flex-1 flex flex-col gap-3">
                {[1, 2].map((idx) => (
                    <div key={idx} className="flex-1 relative rounded-2xl overflow-hidden">
                            <motion.div
                                className="absolute inset-0"
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8, delay: 0.4 + idx * 0.12, ease: [0.25, 0.1, 0.25, 1] as const }}
                            >
                                <Image
                                    src={cocktailImage[idx].src || '/placeholder.svg'}
                                    alt={'Cocktail Image'}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 1280px) 130px, 145px"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                            </motion.div>

                    </div>
                ))}
            </div>
        </div>
    )
}

/* ── HeroSection ─────────────────────────────────────────────── */
export function HeroSection() {

    return (
        <section className="-mt-[72px] pt-[72px] px-4 md:px-12 py-20 min-h-[600px] lg:min-h-[716px] flex items-center relative overflow-hidden">
            <AnimatedBackground />

            <div className="relative z-10 w-full flex items-center gap-12 xl:gap-20">
                {/* Left: text */}
                <motion.div
                    className="flex-1 min-w-0"
                    variants={textContainer}
                    initial="hidden"
                    animate="show"
                >
                    <motion.span variants={textItem} className="font-label uppercase tracking-[0.2em] text-white/80 text-xs mt-4 md:mt-0 mb-4 block">
                        Crafting the Perfect Evening
                    </motion.span>
                    <motion.h1 variants={textItem} className="font-headline text-5xl md:text-7xl text-white mb-6 leading-tight">
                        Mixoguide:<br className="hidden sm:block" /> The Art of the Pour
                    </motion.h1>
                    <motion.p variants={textItem} className="text-white/90 text-lg md:text-xl font-light leading-relaxed mb-10 max-w-lg font-body">
                        Elevate your home bar into a professional atelier. Curate your collection,
                        master techniques, and discover recipes tailored to your pantry.
                    </motion.p>
                    <motion.div variants={textItem} className="flex flex-wrap gap-4">
                        <>
                            <Link href="/signup"
                                  className="px-10 py-4 bg-gradient-to-br from-mg-brown to-mg-caramel text-white rounded-full font-label text-sm uppercase tracking-widest hover:scale-95 transition-transform duration-200">
                                Get Started Free
                            </Link>
                            <a
                                href="https://www.buymeacoffee.com/Whritou"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-10 py-4 bg-gradient-to-br from-mg-brown to-mg-caramel text-white rounded-full font-label text-sm uppercase tracking-widest hover:scale-95 transition-transform duration-200">
                                🍸 Buy me a cocktail
                            </a>
                        </>
                    </motion.div>
                </motion.div>

                {/* Right: image grid */}
                <HeroImageGrid />
            </div>
        </section>
    )
}
