const HEX = /^#([0-9a-f]{6})$/i

function channel(v: number): number {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
    const m = HEX.exec(hex.trim())
    if (!m) throw new Error(`Not a 6-digit hex colour: ${hex}`)
    const n = parseInt(m[1], 16)
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

export function contrastRatio(hexA: string, hexB: string): number {
    const a = luminance(hexA)
    const b = luminance(hexB)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function declarations(body: string): Record<string, string> {
    const out: Record<string, string> = {}
    for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
        const value = m[2].trim()
        if (HEX.test(value)) out[m[1]] = value.toLowerCase()
    }
    return out
}

function blockBodies(css: string, selector: RegExp): string[] {
    const bodies: string[] = []
    const re = new RegExp(`(?:^|(?<=\\}))\\s*${selector.source}\\s*\\{([^}]*)\\}`, 'g')
    for (const m of css.matchAll(re)) bodies.push(m[1])
    return bodies
}

export function parseTokenBlocks(css: string): { light: Record<string, string>; dark: Record<string, string> } {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const light = Object.assign({}, ...blockBodies(stripped, /:root\s*,\s*\.light/).map(declarations))
    const dark = Object.assign({}, ...blockBodies(stripped, /\.dark/).map(declarations))
    return { light, dark }
}
