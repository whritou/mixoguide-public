'use client'
import { useEffect } from 'react'
import { reportError } from '@/utils/reportError'

/**
 * Keeps the screen awake while mounted (recipe view). Handles the race where a
 * `request()` resolves after unmount: the late sentinel is released immediately
 * instead of leaking (CQ-005).
 */
export function useWakeLock() {
    useEffect(() => {
        if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

        let cancelled = false
        let sentinel: WakeLockSentinel | null = null

        const release = (s: WakeLockSentinel) => {
            s.release().catch((e) => reportError(e, 'useWakeLock.release'))
        }

        const acquire = async () => {
            try {
                const next = await navigator.wakeLock.request('screen')
                if (cancelled) {
                    release(next)
                    return
                }
                if (sentinel && !sentinel.released) release(sentinel)
                sentinel = next
            } catch {
                // Feature blocked by OS/browser power settings — not fatal
            }
        }

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') void acquire()
        }

        void acquire()
        document.addEventListener('visibilitychange', onVisibilityChange)

        return () => {
            cancelled = true
            document.removeEventListener('visibilitychange', onVisibilityChange)
            if (sentinel && !sentinel.released) release(sentinel)
            sentinel = null
        }
    }, [])
}
