'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

interface StarRatingProps {
    value: number
    max?: number
    size?: number
    interactive?: boolean
    onChange?: (value: number) => void
    className?: string
}

export default function StarRating({
    value,
    max = 5,
    size = 16,
    interactive = false,
    onChange,
    className = '',
}: StarRatingProps) {
    const [hover, setHover] = useState(0)

    return (
        <span
            className={`inline-flex items-center gap-0.5 ${interactive ? 'cursor-pointer' : ''} ${className}`}
            onMouseLeave={() => interactive && setHover(0)}
        >
            {Array.from({ length: max }, (_, i) => {
                const starValue = i + 1
                const filled = interactive
                    ? starValue <= (hover || value)
                    : starValue <= Math.round(value)
                const halfFilled = !interactive && !filled && starValue - 0.5 <= value

                return (
                    <Star
                        key={i}
                        size={size}
                        className={`transition-colors ${
                            filled
                                ? 'text-amber-400'
                                : halfFilled
                                  ? 'text-amber-300'
                                  : 'text-stone-300'
                        }`}
                        fill={filled ? 'currentColor' : halfFilled ? 'currentColor' : 'none'}
                        onMouseEnter={() => interactive && setHover(starValue)}
                        onClick={() => {
                            if (!interactive || !onChange) return
                            onChange(starValue === value ? 0 : starValue)
                        }}
                    />
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

    const avgClass   = textLight ? 'text-stone-200' : 'text-stone-500'
    const countClass = textLight ? 'text-stone-300' : 'text-stone-400'

    return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
            <StarRating value={avg ?? 0} size={size} />

            {avg != null && (
                <span className={`text-xs font-medium ${avgClass}`}>
                    {avg.toFixed(1)}
                </span>
            )}

            {count != null && count > 0 && (
                <span className={`text-xs ${countClass}`}>
                    ({count})
                </span>
            )}
        </span>
    )
}
