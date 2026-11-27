export const metaLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-on-image/75 font-mono'
export const metaValueClass = 'text-base font-medium leading-tight text-fg-on-image'
export const metaChipClass = 'rounded-full bg-fg-on-image/15 px-2.5 py-1 text-xs font-medium leading-tight text-fg-on-image/95'

export function formatLabel(str: string) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
