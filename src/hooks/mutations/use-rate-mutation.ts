'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invalidators } from '@/lib/invalidation'
import { queryKeys } from '@/lib/query-keys'
import { ratingsApi, type RatingStats } from '@/lib/api/ratings.api'

export type { RatingStats }

export function computeOptimisticStats(
    current: RatingStats,
    prevUserRating: number | null,
    newValue: number,
): RatingStats {
    const { avg, count } = current
    const base = avg ?? 0
    if (newValue === 0 && prevUserRating !== null) {
        const newCount = count - 1
        if (newCount <= 0) return { avg: null, count: 0 }
        return { avg: Math.round(((base * count - prevUserRating) / newCount) * 10) / 10, count: newCount }
    }
    if (prevUserRating === null && newValue > 0) {
        const newCount = count + 1
        return { avg: Math.round(((base * count + newValue) / newCount) * 10) / 10, count: newCount }
    }
    if (prevUserRating !== null && newValue > 0 && newValue !== prevUserRating) {
        return { avg: Math.round(((base * count - prevUserRating + newValue) / count) * 10) / 10, count }
    }
    return current
}

interface UseRateMutationOptions {
    cocktailId: string
    /** Server-rendered aggregate used as the stats query's initial data. */
    initialStats: RatingStats
    userRating: number | null
}

/**
 * Rating stats live in the query cache (`ratings.stats(cocktailId)`) seeded from
 * the server-rendered cocktail, instead of being copied into component state.
 * The mutation applies an optimistic update, then writes the authoritative stats
 * it fetched once after the write, and narrowly invalidates the rating list
 * (for the user's own stars) and the cocktail detail.
 */
export function useRateMutation({ cocktailId, initialStats, userRating }: UseRateMutationOptions) {
    const qc = useQueryClient()
    const statsKey = queryKeys.ratings.stats(cocktailId)

    const { data: stats = initialStats } = useQuery({
        queryKey: statsKey,
        queryFn: () => ratingsApi.statsFor(cocktailId),
        initialData: initialStats,
        staleTime: 5 * 60_000,
        enabled: Boolean(cocktailId),
    })

    const mutation = useMutation({
        mutationFn: async (newValue: number) => {
            const isRemoving = newValue === 0 || newValue === userRating
            if (isRemoving) await ratingsApi.unrate(cocktailId)
            else await ratingsApi.rate(cocktailId, newValue)
            const fresh = await ratingsApi.statsFor(cocktailId).catch(() => null)
            return { isRemoving, fresh }
        },
        onMutate: async (newValue) => {
            await qc.cancelQueries({ queryKey: statsKey })
            const prevStats = qc.getQueryData<RatingStats>(statsKey) ?? stats
            const isRemoving = newValue === 0 || newValue === userRating
            qc.setQueryData<RatingStats>(
                statsKey,
                computeOptimisticStats(prevStats, userRating, isRemoving ? 0 : newValue),
            )
            return { prevStats }
        },
        onError: (_e, _v, ctx) => {
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
            toast.error('Could not save rating')
        },
        onSuccess: ({ isRemoving, fresh }) => {
            if (fresh) qc.setQueryData(statsKey, fresh)
            toast.success(isRemoving ? 'Rating removed' : 'Rating saved')
            return invalidators.ratings(qc, cocktailId)
        },
    })

    return {
        ratingStats: stats,
        ratingLoading: mutation.isPending,
        handleRate: (newValue: number) => {
            if (!mutation.isPending) mutation.mutate(newValue)
        },
    }
}
