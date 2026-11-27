'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { resolveBar } from '@/lib/demo-bar/resolve-bar'
import { parseDemoBar, readDemoBarRaw, subscribeDemoBar, writeDemoBar } from '@/lib/demo-bar/storage'

export { readDemoBar, writeDemoBar, clearDemoBar } from '@/lib/demo-bar/storage'

const NO_SHARED: string[] = []

export function useDemoBar(initial: string[], shared: string[] = NO_SHARED) {
    const raw = useSyncExternalStore(subscribeDemoBar, readDemoBarRaw, () => '')
    const stored = useMemo(() => parseDemoBar(raw), [raw])
    const [touched, setTouched] = useState(false)

    const { ids, source } = resolveBar({ stored, touched, shared, initial })

    const toggle = useCallback((id: string) => {
        writeDemoBar(ids.includes(id) ? ids.filter(v => v !== id) : [...ids, id])
        setTouched(true)
    }, [ids])

    return { ids, toggle, isExample: source === 'example', isShared: source === 'shared' }
}
