import { describe, expect, it } from 'vitest'
import { findRawColors, RAW_COLOR_ALLOWLIST } from '../../../scripts/design/find-raw-colors'

const kinds = (source: string, file = 'src/components/X.tsx') => findRawColors(source, file).map((h) => `${h.kind}:${h.match}`)

describe('findRawColors', () => {
    it.each([
        ['bg-white', 'white-black'],
        ['text-white', 'white-black'],
        ['text-black', 'white-black'],
        ['text-white/80', 'white-black'],
        ['bg-black/40', 'white-black'],
        ['border-white/10', 'white-black'],
        ['from-black/60', 'white-black'],
        ['ring-white', 'white-black'],
        ['fill-white', 'white-black'],
        ['hover:bg-white', 'white-black'],
        ['text-stone-500', 'palette-class'],
        ['bg-red-50', 'palette-class'],
        ['dark:border-stone-700/50', 'palette-class'],
        ['bg-[#faf8f5]', 'arbitrary-hex'],
        ['hover:bg-[#faf8f5]', 'arbitrary-hex'],
        ['divide-[#e4e2df]', 'arbitrary-hex'],
        ['from-[#ab8764]', 'arbitrary-hex'],
        ['text-mg-ink', 'mg-class'],
        ['hover:bg-mg-cream/50', 'mg-class'],
    ])('flags %s as %s', (cls, kind) => {
        const hits = findRawColors(`<div className="flex ${cls} p-2" />`, 'src/components/X.tsx')
        expect(hits).toHaveLength(1)
        expect(hits[0].kind).toBe(kind)
        expect(hits[0].match).toBe(cls)
    })

    it('flags inline hex in tsx strings', () => {
        expect(kinds(`const c = '#78716c'`)).toEqual(['inline-hex:#78716c'])
        expect(kinds(`<Line stroke="#e4e2df" style={{ fill: '#81756a' }} />`)).toEqual(['inline-hex:#e4e2df', 'inline-hex:#81756a'])
        expect(kinds(`const s = "1px solid #fff"`)).toEqual(['inline-hex:#fff'])
    })

    it.each(['shadow-[0_0_8px_#fff]', 'border-[1px_solid_#fff]', 'hover:shadow-[0_2px_4px_#00000033]', 'bg-[linear-gradient(165deg,#2a1e12,#5a3820)]'])(
        'flags hex inside compound arbitrary value %s',
        (cls) => {
            const hits = findRawColors(`<div className="p-2 ${cls}" />`, 'src/components/X.tsx')
            expect(hits).toHaveLength(1)
            expect(hits[0].kind).toBe('arbitrary-hex')
            expect(hits[0].match).toBe(cls)
        },
    )

    it('does not flag compound arbitrary values without hex colours', () => {
        expect(kinds('<div className="shadow-[0_0_8px_var(--x)] bg-[url(#grad)] w-[calc(100%_-_2px)]" />')).toEqual([])
    })

    it('does not count an arbitrary hex twice', () => {
        expect(kinds('<div className="bg-[#faf8f5]" />')).toEqual(['arbitrary-hex:bg-[#faf8f5]'])
    })

    it('reports line numbers', () => {
        const hits = findRawColors('<a />\n<b className="bg-white" />\n', 'src/components/X.tsx')
        expect(hits.map((h) => h.line)).toEqual([2])
    })

    it('does not flag semantic tokens or look-alikes', () => {
        expect(kinds('<div className="bg-surface text-fg-on-image border-line bg-status-ok-dot whitespace-nowrap white-space" />')).toEqual([])
        expect(kinds('.a { white-space: nowrap }', 'src/app/x.css')).toEqual([])
        expect(kinds('<a href="#features">Step #1 &#39; </a>')).toEqual([])
        expect(kinds('<div className="text-whitespace bg-blackout" />')).toEqual([])
    })

    it('skips allowlisted files', () => {
        expect(RAW_COLOR_ALLOWLIST).toEqual(expect.arrayContaining(['src/styles/tokens.css', 'src/lib/pdf/**', 'src/app/**/opengraph-image.tsx']))
        expect(findRawColors('--x: #fff;', 'src/styles/tokens.css')).toEqual([])
        expect(findRawColors("color: '#fff'", 'src/lib/pdf/RecipeCardDocument.tsx')).toEqual([])
        expect(findRawColors('background: "#fff"', 'src/app/cocktails/opengraph-image.tsx')).toEqual([])
        expect(findRawColors('background: "#fff"', 'C:\\repo\\src\\lib\\pdf\\styles.ts')).toEqual([])
    })

    it('allowlists only the brand logo fills in the auth pages', () => {
        const logo = '<path fill="#4285F4" d="M0 0" />'
        expect(findRawColors(logo, 'src/app/(auth)/signin/page.tsx')).toEqual([])
        expect(findRawColors(logo, 'src/app/(auth)/signup/page.tsx')).toEqual([])
        expect(findRawColors(logo, 'src/app/other/page.tsx')).toHaveLength(1)
        expect(findRawColors('<div className="bg-white" />', 'src/app/(auth)/signin/page.tsx')).toHaveLength(1)
    })

    it('allowlists only the Loader tin gradients', () => {
        const f = 'src/components/ui/Loader.tsx'
        expect(findRawColors('<div className="bg-gradient-to-r from-[#ab8764] via-[#e6c8a8] to-[#ab8764] z-0" />', f)).toEqual([])
        expect(findRawColors('<div className="bg-gradient-to-r from-[#8a6b4a] via-[#cfa982] to-[#8a6b4a] z-10" />', f)).toEqual([])
        expect(findRawColors('<div className="bg-[#123456]" />', f)).toHaveLength(1)
    })
})
