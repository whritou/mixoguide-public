'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invalidators } from '@/lib/invalidation'

export type RatingStats = { avg: number | null; count: number }

function computeOptimisticStats(
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
    initialStats: RatingStats
    userRating: number | null
}

export function useRateMutation({ cocktailId, initialStats, userRating }: UseRateMutationOptions) {
    const qc = useQueryClient()
    const [stats, setStats] = useState<RatingStats>(initialStats)
    // Track which cocktailId's server stats we've last synced so that optimistic
    // updates on the current cocktail are not clobbered by background refetches.
    const syncedForRef = useRef<string | null>(null)

    useEffect(() => {
        const hasData = initialStats.avg !== null || initialStats.count > 0
        if (hasData && cocktailId !== syncedForRef.current) {
            syncedForRef.current = cocktailId
            setStats(initialStats)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cocktailId, initialStats.avg, initialStats.count])

    const mutation = useMutation({
        mutationFn: async (newValue: number) => {
            const isRemoving = newValue === 0 || newValue === userRating
            if (isRemoving) {
                const res = await fetch(`/api/ratings/${cocktailId}`, { method: 'DELETE' })
                if (!res.ok) throw new Error()
                toast.success('Rating removed')
            } else {
                const res = await fetch(`/api/ratings/${cocktailId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating: newValue }),
                })
                if (!res.ok) throw new Error()
                toast.success('Rating saved')
            }
            invalidators.ratings(qc)
            const res = await fetch(`/api/ratings/${cocktailId}`)
            if (!res.ok) return null
            const json = await res.json()
            const s = json.data?.stats
            return s ? ({ avg: s.average ?? null, count: s.count ?? 0 } as RatingStats) : null
        },
        onMutate: (newValue) => {
            const isRemoving = newValue === 0 || newValue === userRating
            const prevStats = stats
            setStats(computeOptimisticStats(stats, userRating, isRemoving ? 0 : newValue))
            return { prevStats }
        },
        onError: (_e, _v, ctx) => {
            if (ctx?.prevStats) setStats(ctx.prevStats)
            toast.error('Could not save rating')
        },
        onSuccess: (freshStats) => {
            if (freshStats) setStats(freshStats)
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
