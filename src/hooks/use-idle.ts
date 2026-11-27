'use client'

import { useEffect, useState } from 'react'

/**
 * Becomes `true` once the browser is idle after mount (or after `timeout` ms at
 * the latest). Use it to defer non-critical requests off the initial render path.
 */
export function useIdle(timeout = 2000): boolean {
    const [idle, setIdle] = useState(false)

    useEffect(() => {
        if (typeof window.requestIdleCallback === 'function') {
            const handle = window.requestIdleCallback(() => setIdle(true), { timeout })
            return () => window.cancelIdleCallback(handle)
        }
        const handle = window.setTimeout(() => setIdle(true), Math.min(timeout, 500))
        return () => window.clearTimeout(handle)
    }, [timeout])

    return idle
}
