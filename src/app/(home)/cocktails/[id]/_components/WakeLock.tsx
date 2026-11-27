'use client'

import { useWakeLock } from '@/hooks/useWakeLock'

/** Keeps the screen on while a recipe is open. Renders nothing. */
export function WakeLock() {
    useWakeLock()
    return null
}
