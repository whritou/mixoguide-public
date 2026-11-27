import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import { withPublic } from '@/middlewares/withAuth'
import { loadSharedBar } from '../load-bar'

export const runtime = 'nodejs'

const SIZE = { width: 1200, height: 630 }
const MAX_BOTTLES = 4
const GROUND = '#120d0e'
const GOLD = '#d6b26e'
const CREAM = '#f2e6d6'
const MUTED = '#a8958e'

const FONT_TIMEOUT_MS = 2500

let serifFont: ArrayBuffer | undefined

async function loadSerifFont(): Promise<ArrayBuffer | null> {
    if (serifFont) return serifFont
    const signal = AbortSignal.timeout(FONT_TIMEOUT_MS)
    try {
        const css = await (await fetch('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400', { signal })).text()
        const url = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1]
        if (!url) return null
        serifFont = await (await fetch(url, { signal })).arrayBuffer()
        return serifFont
    } catch {
        return null
    }
}

async function toDataUri(image: string): Promise<string | null> {
    try {
        const file = await readFile(join(process.cwd(), 'public', image))
        return `data:image/png;base64,${file.toString('base64')}`
    } catch {
        return null
    }
}

export const GET = withPublic(async (req: NextRequest) => {
    const { preview, bottleImages } = await loadSharedBar(req.nextUrl.searchParams.get('i') ?? undefined)
    const bottles = (await Promise.all(bottleImages.slice(0, MAX_BOTTLES).map(toDataUri))).filter((src): src is string => src !== null)
    const font = await loadSerifFont()
    const fontFamily = font ? 'Noto Serif' : 'sans-serif'

    const count = preview?.makeableCount ?? 0
    const signature = preview?.top[0]?.name

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 90px',
                    background: GROUND,
                    color: CREAM,
                    fontFamily,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: bottles.length ? 600 : 1020 }}>
                    <div style={{ display: 'flex', fontSize: 26, letterSpacing: 7, textTransform: 'uppercase', color: GOLD }}>
                        {preview ? 'Shared bar' : 'MixoGuide'}
                    </div>
                    {preview ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', fontSize: 190, lineHeight: 1.05, marginTop: 18 }}>{count}</div>
                            <div style={{ display: 'flex', fontSize: 40 }}>
                                {count === 1 ? 'cocktail from this bar' : 'cocktails from this bar'}
                            </div>
                            {signature && (
                                <div style={{ display: 'flex', fontSize: 30, color: MUTED, marginTop: 28 }}>
                                    Signature: {signature}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', fontSize: 96, lineHeight: 1.1, marginTop: 22 }}>Start your own bar</div>
                            <div style={{ display: 'flex', fontSize: 32, color: MUTED, marginTop: 24 }}>
                                Tap the bottles you have at home and see what you can make tonight.
                            </div>
                        </div>
                    )}
                </div>
                {bottles.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                        {bottles.map((src, index) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={index} src={src} alt="" width={120} height={400} style={{ objectFit: 'contain' }} />
                        ))}
                    </div>
                )}
            </div>
        ),
        {
            ...SIZE,
            fonts: font ? [{ name: 'Noto Serif', data: font, style: 'normal', weight: 400 }] : undefined,
            headers: {
                'Cache-Control': font ? 'public, max-age=3600, s-maxage=86400' : 'public, max-age=300, s-maxage=300',
            },
        },
    )
}, { rateLimit: 'makeable-preview' })
