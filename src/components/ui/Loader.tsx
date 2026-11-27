'use client'

import { cn } from '@/lib/utils'

type LoaderVariant = 'page' | 'card' | 'inline' | 'spinner'

interface LoaderProps {
    variant?: LoaderVariant
    label?: string
}

/*
 * Pure-CSS loader (PERF-004: no JS animation library in the shared bundle).
 * Keyframes live in globals.css; every animation stops under
 * prefers-reduced-motion (motion-reduce:animate-none + the global rule).
 * Each variant is a polite live region with a text alternative (A11Y-019).
 */

/* ── Three staggered bouncing dots ───────────────────────── */
function Dots() {
    return (
        <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="block h-2 w-2 rounded-full bg-brand-soft animate-[mg-loader-bounce_0.9s_ease-in-out_infinite] motion-reduce:animate-none"
                    style={{ animationDelay: `${i * 0.18}s` }}
                />
            ))}
        </div>
    )
}

function Shaker() {
    return (
        <div className="flex flex-col items-center justify-center gap-3" aria-hidden="true">
            <div className="relative h-28 w-16 flex items-center justify-center animate-[mg-shake_0.45s_ease-in-out_infinite_alternate] motion-reduce:animate-none">
                {/* Small tin (Top) */}
                <div
                    className="absolute top-0 h-14 w-11 bg-gradient-to-r from-[#ab8764] via-[#e6c8a8] to-[#ab8764] z-0"
                    style={{
                        // Flared out at the bottom
                        clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                        // Slightly narrower (w-11) allows it to rotate without clipping
                        // the edges of the bottom tin (w-12)
                        transform: 'rotate(-6deg) translateY(0px) translateX(-1px)',
                        transformOrigin: 'bottom center',
                    }}
                />

                {/* Big tin (Bottom) */}
                <div
                    className="absolute bottom-0 h-16 w-12 bg-gradient-to-r from-[#8a6b4a] via-[#cfa982] to-[#8a6b4a] z-10 drop-shadow-md"
                    style={{
                        clipPath: 'polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)',
                    }}
                >
                    {/* Inner rim depth */}
                    <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-overlay/27 to-transparent" />
                </div>
            </div>

            <p className="text-sm font-medium text-muted-foreground animate-pulse motion-reduce:animate-none">
                Shaking page content!
            </p>
        </div>
    )
}

/* ── Thin spinning ring ───────────────────────────────────── */
function Ring({ size = 24 }: { size?: number }) {
    return (
        <span
            aria-hidden="true"
            className="block rounded-full border-2 border-line border-t-brand-soft animate-spin [animation-duration:0.8s] motion-reduce:animate-none"
            style={{ width: size, height: size }}
        />
    )
}

const fadeIn = 'animate-in fade-in-0 duration-200 motion-reduce:animate-none'

export default function Loader({ variant = 'page', label }: LoaderProps) {
    const srText = label ?? 'Loading…'

    /* Inline: tiny ring + text, no wrapper */
    if (variant === 'inline') {
        return (
            <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Ring size={12} />
                {srText}
            </span>
        )
    }

    /* Spinner: small centered ring, no extra padding */
    if (variant === 'spinner') {
        return (
            <div role="status" aria-live="polite" className={cn('flex items-center justify-center', fadeIn)}>
                <Ring size={32} />
                <span className="sr-only">{srText}</span>
            </div>
        )
    }

    /* Card: modest vertical padding, inside a card */
    if (variant === 'card') {
        return (
            <div
                role="status"
                aria-live="polite"
                className={cn('flex flex-col items-center justify-center gap-3 py-12', fadeIn)}
            >
                <Dots />
                {label ? (
                    <p className="text-sm text-muted-foreground">{label}</p>
                ) : (
                    <span className="sr-only">{srText}</span>
                )}
            </div>
        )
    }

    /* Page (default): large centred area, fades in */
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn('col-span-full flex flex-col items-center justify-center gap-3 py-24', fadeIn)}
        >
            <Shaker />
            {label ? (
                <p className="text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-1 delay-150 duration-200 motion-reduce:animate-none">
                    {label}
                </p>
            ) : (
                <span className="sr-only">{srText}</span>
            )}
        </div>
    )
}
