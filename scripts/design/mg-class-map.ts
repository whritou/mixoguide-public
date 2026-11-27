export const PREFIXES = [
    'bg', 'text', 'border', 'ring', 'from', 'to', 'via', 'fill', 'stroke',
    'outline', 'divide', 'placeholder', 'shadow', 'decoration', 'accent', 'ring-offset',
    'border-t', 'border-r', 'border-b', 'border-l', 'border-x', 'border-y', 'border-s', 'border-e',
] as const

const GENERIC: Record<string, string> = {
    cream: 'canvas',
    linen: 'surface-subtle',
    parchment: 'surface-muted',
    'parchment-hover': 'surface-muted-hover',
    smoke: 'surface-hover',
    frost: 'surface-hover-alt',
    haze: 'canvas-hover',
    dusk: 'canvas-hover-alt',
    charcoal: 'fg-secondary',
    dim: 'fg-dim',
    muted: 'fg-muted',
    brown: 'brand',
    caramel: 'brand-soft',
    copper: 'brand-warm',
    sand: 'line',
    bone: 'line-strong',
    sage: 'success',
    'sage-light': 'success-bg',
    rust: 'missing',
    'rust-light': 'missing-bg',
    amber: 'warning-accent',
    'amber-light': 'warning-bg',
    danger: 'danger',
    'danger-light': 'danger-bg',
}

const AMBIGUOUS_UTILITIES = new Set<string>([
    ...PREFIXES.filter(p => p !== 'text').map(p => `${p}-mg-ink`),
    ...PREFIXES.map(p => `${p}-mg-espresso`),
    ...PREFIXES.filter(p => p !== 'text').flatMap(p => [`${p}-mg-sage`, `${p}-mg-muted`]),
    'text-mg-caramel',
    'fill-mg-caramel',
    'bg-mg-sand',
    ...PREFIXES.filter(p => p === 'border' || p.startsWith('border-')).map(p => `${p}-mg-bone`),
    'divide-mg-bone',
])

const OVERRIDES: Record<string, string> = {
    'text-mg-ink': 'text-fg',
    'from-mg-brown': 'from-brand-gradient-from',
    'to-mg-caramel': 'to-brand-gradient-to',
    'ring-mg-caramel': 'ring-ring',
    'outline-mg-caramel': 'outline-ring',
    'text-mg-amber': 'text-warning',
}

export const AMBIGUOUS: string[] = [...AMBIGUOUS_UTILITIES]

export const MG_CLASS_MAP: Record<string, string> = (() => {
    const map: Record<string, string> = {}
    for (const prefix of PREFIXES) {
        for (const [name, target] of Object.entries(GENERIC)) {
            const key = `${prefix}-mg-${name}`
            if (!AMBIGUOUS_UTILITIES.has(key)) map[key] = `${prefix}-${target}`
        }
    }
    return { ...map, ...OVERRIDES }
})()
