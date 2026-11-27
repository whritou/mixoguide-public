import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { DecoDivider } from '@/components/ui/deco-divider'
import { Eyebrow } from '@/components/ui/eyebrow'
import { cn } from '@/lib/utils'
import { absoluteUrl, firstParam, loadRateLimitedBar } from './load-bar'

type SearchParams = Promise<{ i?: string | string[] }>

const MAX_LINES = 3

const loadBar = cache(loadRateLimitedBar)

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
    const { param, preview } = await loadBar(firstParam((await searchParams).i))
    const image = absoluteUrl(`/bar/og${preview ? `?i=${param}` : ''}`)
    const title = preview ? `This bar makes ${preview.makeableCount} ${preview.makeableCount === 1 ? 'cocktail' : 'cocktails'} | MixoGuide` : 'Start your own bar | MixoGuide'
    const description = preview
        ? 'See what this bar can make, then try it with your own bottles.'
        : 'Tap the bottles you have at home and see what you can make tonight.'
    return {
        robots: { index: false },
        title,
        description,
        openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
        twitter: { card: 'summary_large_image', title, description, images: [image] },
    }
}

export default async function SharedBarPage({ searchParams }: { searchParams: SearchParams }) {
    const { param, preview } = await loadBar(firstParam((await searchParams).i))

    if (!preview) {
        return (
            <div className="bg-canvas text-fg">
                <div className="mx-auto flex min-h-[60vh] max-w-[560px] flex-col items-center justify-center gap-5 px-6 py-24 text-center">
                    <Eyebrow>Shared bar</Eyebrow>
                    <h1 className="m-0 font-headline text-[40px] font-normal leading-[1.1]">Start your own bar</h1>
                    <p className="m-0 text-[17px] leading-[27px] text-fg-secondary">
                        Tap the bottles you have at home and see what you can make tonight.
                    </p>
                    <Link href="/#shelf" className={cn(buttonVariants({ variant: 'pill', size: 'lg' }), 'h-12 px-8')}>
                        Start your own bar
                    </Link>
                </div>
            </div>
        )
    }

    const count = preview.makeableCount
    const lines = preview.top.slice(0, MAX_LINES)
    const signature = lines[0]
    const more = count - lines.length

    return (
        <div className="bg-canvas text-fg">
            <div className="mx-auto flex max-w-[560px] flex-col gap-8 px-6 py-24">
                <div className="flex flex-col items-center gap-3 text-center">
                    <Eyebrow className="text-[11px] tracking-[.24em]">Shared bar</Eyebrow>
                    <h1 className="m-0 font-headline text-[40px] font-normal leading-[1.1]">
                        This bar makes {count} {count === 1 ? 'cocktail' : 'cocktails'}
                    </h1>
                    {signature && <p className="m-0 text-[17px] text-fg-secondary">Signature: {signature.name}</p>}
                    <DecoDivider className="w-[180px] gap-2.5 pt-1.5 text-[9px]" />
                </div>

                <div className="flex flex-col">
                    {lines.map(cocktail => (
                        <Link
                            key={cocktail.id}
                            href={`/cocktails/${cocktail.id}`}
                            className="flex items-baseline gap-2 border-b border-line py-3"
                        >
                            <span className="font-headline text-xl text-fg">{cocktail.name}</span>
                            <span className="flex-1 border-b border-dotted border-line-strong" aria-hidden="true" />
                            {cocktail.preparationTime ? (
                                <span className="text-xs text-fg-muted">{cocktail.preparationTime} min</span>
                            ) : null}
                        </Link>
                    ))}
                    {more > 0 && <span className="pt-3 text-[13px] text-fg-muted">and {more} more</span>}
                </div>

                <Link
                    href={`/?bar=${param}#shelf`}
                    className={cn(buttonVariants({ variant: 'pill', size: 'lg' }), 'h-12 self-center px-8')}
                >
                    Try it with your own bar
                </Link>
            </div>
        </div>
    )
}
