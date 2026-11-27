'use client'

import { Star } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'

interface StarRatingProps {
    value: number
    max?: number
    size?: number
    interactive?: boolean
    onChange?: (value: number) => void
    className?: string
    /** Accessible name of the rating group (interactive) — defaults to "Your rating". */
    label?: string
}

/**
 * WAI-ARIA radio-group keyboard model: Right/Up = next, Left/Down = previous
 * (both wrap), Home = 1, End = max. Returns null for keys the group ignores.
 */
export function nextRatingForKey(key: string, current: number, max: number): number | null {
    switch (key) {
        case 'ArrowRight':
        case 'ArrowUp':
            return current >= max ? 1 : current + 1
        case 'ArrowLeft':
        case 'ArrowDown':
            return current <= 1 ? max : current - 1
        case 'Home':
            return 1
        case 'End':
            return max
        default:
            return null
    }
}

function starClass(filled: boolean, halfFilled: boolean) {
    return `transition-colors ${
        filled
            ? 'text-status-partial-dot'
            : halfFilled
              ? 'text-status-partial-dot/60'
              : 'text-line-strong'
    }`
}

/**
 * Star rating.
 *
 * - Display mode (default): a single `role="img"` with a text alternative
 *   ("Rated 3.5 out of 5"); the star glyphs are hidden from assistive tech.
 * - Interactive mode: a WAI-ARIA radio group. One tab stop (roving tabindex),
 *   Arrow keys / Home / End move and select, Space/Enter select, and clicking
 *   the current value clears it. Each target is at least 24×24 px (WCAG 2.5.8).
 */
export default function StarRating({
    value,
    max = 5,
    size = 16,
    interactive = false,
    onChange,
    className = '',
    label = 'Your rating',
}: StarRatingProps) {
    const [hover, setHover] = useState(0)
    const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])

    if (!interactive) {
        const rounded = Math.round(value * 10) / 10
        return (
            <span
                role="img"
                aria-label={value > 0 ? `Rated ${rounded} out of ${max}` : 'Not rated yet'}
                className={`inline-flex items-center gap-0.5 ${className}`}
            >
                {Array.from({ length: max }, (_, i) => {
                    const starValue = i + 1
                    const filled = starValue <= Math.round(value)
                    const halfFilled = !filled && starValue - 0.5 <= value
                    return (
                        <Star
                            key={i}
                            size={size}
                            aria-hidden="true"
                            className={starClass(filled, halfFilled)}
                            fill={filled || halfFilled ? 'currentColor' : 'none'}
                        />
                    )
                })}
            </span>
        )
    }

    const current = Math.round(value)
    const focusIndex = current > 0 ? current - 1 : 0

    const select = (starValue: number, focus = false) => {
        onChange?.(starValue)
        if (focus) buttonsRef.current[starValue - 1]?.focus()
    }

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, starValue: number) => {
        const next = nextRatingForKey(e.key, starValue, max)
        if (next == null) return
        e.preventDefault()
        select(next, true)
    }

    return (
        <span
            role="radiogroup"
            aria-label={label}
            className={`inline-flex items-center ${className}`}
            onMouseLeave={() => setHover(0)}
        >
            {Array.from({ length: max }, (_, i) => {
                const starValue = i + 1
                const filled = starValue <= (hover || value)
                return (
                    <button
                        key={i}
                        ref={(el) => {
                            buttonsRef.current[i] = el
                        }}
                        type="button"
                        role="radio"
                        aria-checked={current === starValue}
                        aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
                        tabIndex={i === focusIndex ? 0 : -1}
                        className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onMouseEnter={() => setHover(starValue)}
                        onFocus={() => setHover(0)}
                        onKeyDown={(e) => onKeyDown(e, starValue)}
                        onClick={() => onChange?.(starValue === value ? 0 : starValue)}
                    >
                        <Star
                            size={size}
                            aria-hidden="true"
                            className={starClass(filled, false)}
                            fill={filled ? 'currentColor' : 'none'}
                        />
                    </button>
                )
            })}
        </span>
    )
}

export function StarRatingDisplay({
                                      avg,
                                      count,
                                      size = 14,
                                      className = '',
                                      textLight = false,
                                  }: {
    avg?: number
    count?: number
    size?: number
    className?: string
    textLight?: boolean
}) {
    if (!avg && !count) return null

    const avgClass   = textLight ? 'text-fg-on-image/90' : 'text-fg-dim'
    const countClass = textLight ? 'text-fg-on-image/80' : 'text-fg-muted'

    return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
            <StarRating value={avg ?? 0} size={size} />

            {avg != null && (
                <span aria-hidden="true" className={`text-xs font-medium ${avgClass}`}>
                    {avg.toFixed(1)}
                </span>
            )}

            {count != null && count > 0 && (
                <span className={`text-xs ${countClass}`}>
                    ({count}<span className="sr-only"> {count === 1 ? 'rating' : 'ratings'}</span>)
                </span>
            )}
        </span>
    )
}
