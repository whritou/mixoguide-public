'use client'

import { useSession } from 'next-auth/react'
import StarRating, { StarRatingDisplay } from '@/components/StarRating'
import { useRateMutation } from '@/hooks/mutations/use-rate-mutation'
import { useRatingsQuery } from '@/hooks/queries/use-ratings'
import { metaLabelClass } from './styles'

/** Overall rating (seeded from the server render) + the signed-in user's own stars. */
export function CocktailRating({
    cocktailId,
    initialAvg,
    initialCount,
}: {
    cocktailId: string
    initialAvg: number | null
    initialCount: number
}) {
    const { data: session, status } = useSession()
    const isAuthenticated = status === 'authenticated'

    const { data } = useRatingsQuery({ cocktailId }, { enabled: isAuthenticated })
    const userRating = data?.items.find(r => r.userId === session?.user?.id)?.rating ?? null

    const { ratingStats, ratingLoading, handleRate } = useRateMutation({
        cocktailId,
        initialStats: { avg: initialAvg, count: initialCount },
        userRating,
    })

    return (
        <div className="flex flex-wrap items-start gap-5">
            <div className="flex flex-col gap-1.5">
                <span className={metaLabelClass}>Overall Rating</span>
                <StarRatingDisplay
                    avg={ratingStats.avg ?? 0}
                    count={ratingStats.count}
                    size={18}
                    textLight
                />
            </div>

            {session?.user && (
                <div className="flex flex-col gap-1.5">
                    <span className={metaLabelClass}>Your rating</span>
                    <StarRating
                        label="Your rating"
                        value={userRating ?? 0}
                        size={18}
                        interactive={!ratingLoading && isAuthenticated}
                        onChange={handleRate}
                    />
                </div>
            )}
        </div>
    )
}
