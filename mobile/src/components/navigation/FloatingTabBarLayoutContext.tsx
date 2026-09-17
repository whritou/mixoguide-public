import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
    FLOATING_TAB_SCROLL_GAP,
    floatingTabControlBottom,
    floatingTabScrollPadding,
} from './floatingTabBarMetrics'

type FloatingTabBarLayoutContextValue = {
    hasAdSlot: boolean
    setHasAdSlot: (visible: boolean) => void
}

const FloatingTabBarLayoutContext = createContext<FloatingTabBarLayoutContextValue>({
    hasAdSlot: false,
    setHasAdSlot: () => undefined,
})

export function FloatingTabBarLayoutProvider({ children }: { children: ReactNode }) {
    const [hasAdSlot, setHasAdSlot] = useState(false)
    const value = useMemo(() => ({ hasAdSlot, setHasAdSlot }), [hasAdSlot])

    return (
        <FloatingTabBarLayoutContext.Provider value={value}>
            {children}
        </FloatingTabBarLayoutContext.Provider>
    )
}

export function useReportFloatingTabAdSlot() {
    return useContext(FloatingTabBarLayoutContext).setHasAdSlot
}

export function useFloatingTabBarLayout(bottomInset: number) {
    const { hasAdSlot } = useContext(FloatingTabBarLayoutContext)

    const getScrollPadding = useCallback(
        (extra = FLOATING_TAB_SCROLL_GAP) => floatingTabScrollPadding(bottomInset, extra, hasAdSlot),
        [bottomInset, hasAdSlot]
    )

    return {
        hasAdSlot,
        controlBottom: floatingTabControlBottom(bottomInset, hasAdSlot),
        getScrollPadding,
    }
}
