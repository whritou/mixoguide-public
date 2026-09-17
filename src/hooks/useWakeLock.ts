'use client'
import { useEffect } from 'react'
import { reportError } from '@/utils/reportError'

export function useWakeLock() {
    useEffect(() => {
        if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

        let sentinel: WakeLockSentinel | null = null

        const acquire = async () => {
            try {
                sentinel = await navigator.wakeLock.request('screen')
            } catch {
                // Feature blocked by OS/browser power settings — not fatal
            }
        }

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') acquire()
        }

        acquire()
        document.addEventListener('visibilitychange', onVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            sentinel?.release().catch((e) => reportError(e, 'useWakeLock.release'))
        }
    }, [])
}
