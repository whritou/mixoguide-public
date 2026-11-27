import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export type RawColorKind = 'mg-class' | 'palette-class' | 'white-black' | 'arbitrary-hex' | 'inline-hex'
export type RawColorHit = { file: string; line: number; match: string; kind: RawColorKind }

export const RAW_COLOR_ALLOWLIST: string[] = [
    'src/styles/tokens.css',
    'src/lib/pdf/**',
    'src/app/**/opengraph-image.tsx',
    'src/app/(home)/bar/og/route.tsx',
    'src/utils/mail.ts',
    'src/components/home/landing/RecipeCard.module.css',
    'src/components/home/landing/PhoneFrame.module.css',
]

export const RAW_COLOR_LINE_ALLOWLIST: { file: string; pattern: RegExp }[] = [
    { file: 'src/app/(auth)/signin/page.tsx', pattern: /<path fill="#(?:4285F4|34A853|FBBC05|EA4335)"/ },
    { file: 'src/app/(auth)/signup/page.tsx', pattern: /<path fill="#(?:4285F4|34A853|FBBC05|EA4335)"/ },
    { file: 'src/components/home/cocktails/CocktailHero.tsx', pattern: /bg-\[linear-gradient\(165deg,#2a1e12,#5a3820\)\]/ },
    { file: 'src/components/home/cocktails/CocktailHero.tsx', pattern: /text-\[#d9b384\]/ },
    { file: 'src/app/(home)/cocktails/[id]/page.tsx', pattern: /bg-\[linear-gradient\(165deg,#2a1e12,#5a3820\)\]/ },
    { file: 'src/app/(home)/cocktails/[id]/page.tsx', pattern: /text-\[#d9b384\]/ },
    { file: 'src/app/(auth)/layout.tsx', pattern: /linear-gradient\(135deg, #1b1c1a 0%, #3d2e1f 30%, #7a5830 60%, #bc9366 85%, #d3c4b7 100%\)/ },
    { file: 'src/app/(auth)/layout.tsx', pattern: /radial-gradient\(circle at 70% 30%, #bc9366 0%, transparent 50%\), radial-gradient\(circle at 20% 80%, #7a5830 0%, transparent 40%\)/ },
    { file: 'src/components/ui/Loader.tsx', pattern: /from-\[#ab8764\] via-\[#e6c8a8\] to-\[#ab8764\]/ },
    { file: 'src/components/ui/Loader.tsx', pattern: /from-\[#8a6b4a\] via-\[#cfa982\] to-\[#8a6b4a\]/ },
]

const COLOR_PREFIX =
    '(?:bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|fill|stroke|from|via|to|divide|outline|decoration|shadow|accent|caret|placeholder)'
const VARIANTS = '(?:[a-z0-9-]+:)*'
const PALETTES =
    '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)'
const OPACITY = '(?:\\/(?:\\d+|\\[[0-9.]+\\]))?'
const END = '(?![\\w-])'
const START = '(?<![\\w-])'

const MG_RE = new RegExp(`${START}${VARIANTS}[a-z]+(?:-[a-z]+)*-mg-[a-z0-9-]+${OPACITY}`, 'g')
const ARBITRARY_HEX_RE = new RegExp(`${START}${VARIANTS}[a-z-]+-\\[#[0-9a-fA-F]{3,8}\\]${OPACITY}`, 'g')
const ARBITRARY_COMPOUND_HEX_RE = new RegExp(
    `${START}${VARIANTS}[a-z-]+-\\[[^\\]\\s]*[_,(:]#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\\w-])[^\\]\\s]*\\]${OPACITY}`,
    'g',
)
const PALETTE_RE = new RegExp(`${START}${VARIANTS}${COLOR_PREFIX}-${PALETTES}-\\d{2,3}${OPACITY}${END}`, 'g')
const WHITE_BLACK_RE = new RegExp(`${START}${VARIANTS}${COLOR_PREFIX}-(?:white|black)${OPACITY}${END}`, 'g')
const INLINE_HEX_RE = /(?<![\w&/#[])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g

const RULES: { kind: RawColorKind; re: RegExp }[] = [
    { kind: 'mg-class', re: MG_RE },
    { kind: 'arbitrary-hex', re: ARBITRARY_HEX_RE },
    { kind: 'arbitrary-hex', re: ARBITRARY_COMPOUND_HEX_RE },
    { kind: 'palette-class', re: PALETTE_RE },
    { kind: 'white-black', re: WHITE_BLACK_RE },
    { kind: 'inline-hex', re: INLINE_HEX_RE },
]

function globToRegExp(glob: string): RegExp {
    let out = ''
    for (let i = 0; i < glob.length; i++) {
        const c = glob[i]
        if (c === '*' && glob[i + 1] === '*') {
            out += '.*'
            i++
            if (glob[i + 1] === '/') i++
        } else if (c === '*') out += '[^/]*'
        else out += c.replace(/[.+^${}()|[\]\\?]/g, '\\$&')
    }
    return new RegExp(`(^|/)${out}$`)
}

const ALLOWLIST_RES = RAW_COLOR_ALLOWLIST.map(globToRegExp)

function normalise(file: string): string {
    return file.replace(/\\/g, '/')
}

function isAllowlistedLine(file: string, text: string): boolean {
    const path = normalise(file)
    return RAW_COLOR_LINE_ALLOWLIST.some((entry) => path.endsWith(entry.file) && entry.pattern.test(text))
}

export function findRawColors(source: string, file: string): RawColorHit[] {
    const path = normalise(file)
    if (ALLOWLIST_RES.some((re) => re.test(path))) return []
    const hits: RawColorHit[] = []
    source.split('\n').forEach((text, index) => {
        if (isAllowlistedLine(file, text)) return
        let remaining = text
        for (const { kind, re } of RULES) {
            remaining = remaining.replace(re, (match) => {
                hits.push({ file, line: index + 1, match, kind })
                return ' '.repeat(match.length)
            })
        }
    })
    return hits
}

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.css'])

function collectFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.next') continue
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) collectFiles(full, out)
        else if (SCANNED_EXTENSIONS.has(extname(entry))) out.push(full)
    }
    return out
}

function main(argv: string[]): void {
    const dir = argv.find((a) => !a.startsWith('--'))
    if (!dir) {
        console.error('Usage: find-raw-colors.ts <dir>')
        process.exit(2)
    }

    const hits: RawColorHit[] = []
    for (const full of collectFiles(resolve(dir))) {
        const file = normalise(relative(process.cwd(), full))
        hits.push(...findRawColors(readFileSync(full, 'utf8'), file))
    }

    for (const h of hits) console.log(`${h.file}:${h.line}:${h.kind}:${h.match}`)

    const perKind = new Map<RawColorKind, number>()
    for (const h of hits) perKind.set(h.kind, (perKind.get(h.kind) ?? 0) + 1)
    console.log(`\n${hits.length} raw colour(s)`)
    for (const [kind, n] of [...perKind].sort((a, b) => b[1] - a[1])) console.log(`  ${kind}: ${n}`)
    process.exit(hits.length ? 1 : 0)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
