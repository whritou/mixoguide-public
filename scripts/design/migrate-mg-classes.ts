import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AMBIGUOUS, MG_CLASS_MAP } from './mg-class-map'

export type AmbiguousHit = { line: number; token: string }

const AMBIGUOUS_SET = new Set(AMBIGUOUS)

const CLASS_RE = new RegExp(
    '(^|[\\s"\'`:!;(])((?:[a-z0-9-]+:)*)([a-z0-9]+(?:-[a-z0-9]+)*?)-mg-([a-z-]+?)(\\/(?:\\d+|\\[[0-9.]+\\]))?(?=[\\s"\'`;)]|$)',
    'gm',
)

function run(source: string): { output: string; ambiguous: AmbiguousHit[]; replaced: number; unknown: AmbiguousHit[] } {
    const ambiguous: AmbiguousHit[] = []
    const unknown: AmbiguousHit[] = []
    let replaced = 0
    const output = source.replace(CLASS_RE, (match, lead: string, variants: string, prefix: string, name: string, opacity: string | undefined, offset: number) => {
        const utility = `${prefix}-mg-${name}`
        const suffix = opacity ?? ''
        const target = MG_CLASS_MAP[utility]
        if (target && !AMBIGUOUS_SET.has(utility)) {
            replaced++
            return `${lead}${variants}${target}${suffix}`
        }
        const line = source.slice(0, offset + lead.length).split('\n').length
        const hit = { line, token: `${variants}${utility}${suffix}` }
        if (AMBIGUOUS_SET.has(utility)) ambiguous.push(hit)
        else unknown.push(hit)
        return match
    })
    return { output, ambiguous, replaced, unknown }
}

export function migrateClasses(source: string): { output: string; ambiguous: AmbiguousHit[]; unknown: AmbiguousHit[] } {
    const { output, ambiguous, unknown } = run(source)
    return { output, ambiguous, unknown }
}

function collectFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules') continue
        const full = join(dir, entry)
        const stat = statSync(full)
        if (stat.isDirectory()) collectFiles(full, out)
        else if (['.ts', '.tsx', '.css'].includes(extname(entry))) out.push(full)
    }
    return out
}

function main(argv: string[]): void {
    const write = argv.includes('--write')
    const dir = argv.find(a => !a.startsWith('--'))
    if (!dir) {
        console.error('Usage: migrate-mg-classes.ts <dir> [--write]')
        process.exit(1)
    }

    let files = 0
    let replacements = 0
    const ambiguousByFile: { file: string; hits: AmbiguousHit[] }[] = []
    const unknownByFile: { file: string; hits: AmbiguousHit[] }[] = []

    for (const file of collectFiles(resolve(dir))) {
        const source = readFileSync(file, 'utf8')
        const { output, ambiguous, replaced, unknown } = run(source)
        if (ambiguous.length) ambiguousByFile.push({ file, hits: ambiguous })
        if (unknown.length) unknownByFile.push({ file, hits: unknown })
        if (output === source) continue
        files++
        replacements += replaced
        console.log(`${write ? 'updated' : 'would update'} ${file}: ${replaced} replacement(s)`)
        if (write) writeFileSync(file, output)
    }

    const total = ambiguousByFile.reduce((n, f) => n + f.hits.length, 0)
    console.log(`\n${files} file(s), ${replacements} replacement(s), ${total} ambiguous${write ? '' : ' (dry run)'}`)
    const unknownTotal = unknownByFile.reduce((n, f) => n + f.hits.length, 0)
    if (unknownTotal) {
        console.log(`\nUnknown mg-* utilities (${unknownTotal}, not in map, left unchanged):`)
        for (const { file, hits } of unknownByFile) {
            for (const h of hits) console.log(`  ${file}:${h.line}  ${h.token}`)
        }
    }
    if (total) {
        console.log('\nAmbiguous (left unchanged):')
        for (const { file, hits } of ambiguousByFile) {
            for (const h of hits) console.log(`  ${file}:${h.line}  ${h.token}`)
        }
        const tally = new Map<string, number>()
        for (const { hits } of ambiguousByFile) {
            for (const h of hits) tally.set(h.token, (tally.get(h.token) ?? 0) + 1)
        }
        console.log('\nTop ambiguous tokens:')
        for (const [token, n] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${n}  ${token}`)
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
