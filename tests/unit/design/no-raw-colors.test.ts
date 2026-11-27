import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findRawColors } from '../../../scripts/design/find-raw-colors'

const ROOT = resolve(__dirname, '../../..')
const SCANNED = new Set(['.ts', '.tsx', '.css'])

function collect(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.next') continue
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) collect(full, out)
        else if (SCANNED.has(extname(entry))) out.push(full)
    }
    return out
}

describe('no raw colours in src', () => {
    it('uses semantic tokens everywhere outside the allowlist', () => {
        const hits = collect(join(ROOT, 'src')).flatMap((full) =>
            findRawColors(readFileSync(full, 'utf8'), relative(ROOT, full).replace(/\\/g, '/')),
        )
        expect(hits.map((h) => `${h.file}:${h.line} ${h.match}`)).toEqual([])
    })

    it('detects a regression', () => {
        expect(findRawColors('<div className="bg-white shadow-[0_0_8px_#fff]" />', 'src/components/X.tsx')).toHaveLength(2)
    })
})
