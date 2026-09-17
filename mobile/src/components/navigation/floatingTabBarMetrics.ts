export const FLOATING_TAB_AD_SLOT_HEIGHT = 56
export const FLOATING_TAB_BAR_HEIGHT = 64
export const FLOATING_TAB_BAR_TOP_PADDING = 8
export const FLOATING_TAB_BAR_BOTTOM_MIN = 10
export const FLOATING_TAB_CONTROL_GAP = 16
export const FLOATING_TAB_SCROLL_GAP = 24

export function floatingTabOverlayHeight(bottomInset: number, hasAdSlot = true): number {
    return (
        (hasAdSlot ? FLOATING_TAB_AD_SLOT_HEIGHT : 0) +
        FLOATING_TAB_BAR_TOP_PADDING +
        FLOATING_TAB_BAR_HEIGHT +
        Math.max(bottomInset, FLOATING_TAB_BAR_BOTTOM_MIN)
    )
}

export function floatingTabControlBottom(bottomInset: number, hasAdSlot = true): number {
    return floatingTabOverlayHeight(bottomInset, hasAdSlot) + FLOATING_TAB_CONTROL_GAP
}

export function floatingTabScrollPadding(bottomInset: number, extra = FLOATING_TAB_SCROLL_GAP, hasAdSlot = true): number {
    return floatingTabOverlayHeight(bottomInset, hasAdSlot) + extra
}
