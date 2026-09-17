'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type UseOffsetAccumulatorOptions<T> = {
    filterKey: string
    offset: number
    pageItems: T[]
    isLoading: boolean
    isFetched?: boolean
    isFetching?: boolean
    enabled?: boolean
    waitForFetchWhenEmpty?: boolean
    getId?: (item: T) => string
}

export function useOffsetAccumulator<T extends { id: string }>(
    options: UseOffsetAccumulatorOptions<T>,
) {
    const {
        filterKey,
        offset,
        pageItems,
        isLoading,
        isFetched = true,
        isFetching = false,
        enabled = true,
        waitForFetchWhenEmpty = false,
        getId,
    } = options

    const [items, setItems] = useState<T[]>([])
    const accumulatedOffsetRef = useRef(-1)
    const prevFilterKeyRef = useRef(filterKey)

    const reset = useCallback(() => {
        setItems([])
        accumulatedOffsetRef.current = -1
    }, [])

    useEffect(() => {
        if (prevFilterKeyRef.current !== filterKey) {
            prevFilterKeyRef.current = filterKey
            // eslint-disable-next-line react-hooks/set-state-in-effect
            reset()
        }
    }, [filterKey, reset])

    useEffect(() => {
        if (!enabled || isLoading) return
        if (!isFetched && pageItems.length === 0) return
        if (waitForFetchWhenEmpty && !isFetching && pageItems.length === 0) return
        if (accumulatedOffsetRef.current === offset) return
        if (offset > 0 && pageItems.length === 0) return

        accumulatedOffsetRef.current = offset
        if (offset === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setItems(pageItems)
            return
        }

        setItems((previousItems) => {
            const seen = new Set(previousItems.map((item) => (getId ? getId(item) : item.id)))
            return [...previousItems, ...pageItems.filter((item) => !seen.has(getId ? getId(item) : item.id))]
        })
    }, [enabled, getId, isFetched, isFetching, isLoading, offset, pageItems, waitForFetchWhenEmpty])

    return {
        items,
        reset,
    }
}
