'use client'

import { useEffect, useRef } from 'react'

interface AutoLoadMoreOptions {
    enabled: boolean
    isLoading: boolean
    onLoadMore: () => void
    rootMargin?: string
}

export function useAutoLoadMore({
    enabled,
    isLoading,
    onLoadMore,
    rootMargin = '400px',
}: AutoLoadMoreOptions) {
    const sentinelRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel || !enabled) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isLoading) {
                    onLoadMore()
                }
            },
            { rootMargin },
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [enabled, isLoading, onLoadMore, rootMargin])

    return sentinelRef
}
