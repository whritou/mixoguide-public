'use client'

import { motion } from 'motion/react'

type LoaderVariant = 'page' | 'card' | 'inline' | 'spinner'

interface LoaderProps {
    variant?: LoaderVariant
    label?: string
}

/* ── Three staggered bouncing dots ───────────────────────── */
function Dots() {
    return (
        <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className="block h-2 w-2 rounded-full bg-brand-soft"
                    animate={{ y: [0, -7, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        delay: i * 0.18,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    )
}

function Shaker() {
    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <motion.div
                className="relative h-28 w-16 flex items-center justify-center"
                animate={{
                    rotate: [-18, 18],
                    x: [-6, 6],
                    y: [-1, 1],
                }}
                transition={{
                    duration: 0.45,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut',
                }}
            >
                {/* Small tin (Top) */}
                <div
                    className="absolute top-0 h-14 w-11 bg-gradient-to-r from-[#ab8764] via-[#e6c8a8] to-[#ab8764] z-0"
                    style={{
                        // Flared out at the bottom
                        clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                        // Slightly narrower (w-11) allows it to rotate without clipping
                        // the edges of the bottom tin (w-12)
                        transform: 'rotate(-6deg) translateY(0px) translateX(-1px)',
                        transformOrigin: 'bottom center'
                    }}
                />

                {/* Big tin (Bottom) */}
                <div
                    className="absolute bottom-0 h-16 w-12 bg-gradient-to-r from-[#8a6b4a] via-[#cfa982] to-[#8a6b4a] z-10 drop-shadow-md"
                    style={{
                        clipPath: 'polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)',
                    }}
                >
                    {/* Darker seal line for better contrast */}
                    {/* Inner rim depth */}
                    <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-overlay/27 to-transparent" />
                </div>
            </motion.div>

            <motion.p
                className="text-sm font-medium text-muted-foreground"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1, repeat: Infinity }}
            >
                Shaking page content !
            </motion.p>
        </div>
    );
}

/* ── Thin spinning ring ───────────────────────────────────── */
function Ring({ size = 24 }: { size?: number }) {
    return (
        <motion.span
            className="block rounded-full border-2 border-line border-t-brand-soft"
            style={{ width: size, height: size }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
    )
}

export default function Loader({ variant = 'page', label }: LoaderProps) {
    /* Inline: tiny single dot pulse, no wrapper */
    if (variant === 'inline') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Ring size={12} />
                {label ?? 'Loading…'}
            </span>
        )
    }

    /* Spinner: small centered ring, no extra padding */
    if (variant === 'spinner') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center"
            >
                <Ring size={32} />
            </motion.div>
        )
    }

    /* Card: modest vertical padding, inside a card */
    if (variant === 'card') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center gap-3 py-12"
            >
                <Dots />
                {label && <p className="text-sm text-muted-foreground">{label}</p>}
            </motion.div>
        )
    }

    /* Page (default): large centred area, fades in */
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="col-span-full flex flex-col items-center justify-center gap-3 py-24"
        >
            <Shaker />
            {label && (
                <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.25 }}
                    className="text-sm text-muted-foreground"
                >
                    {label}
                </motion.p>
            )}
        </motion.div>
    )
}
