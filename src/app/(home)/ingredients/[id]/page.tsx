import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Droplets, GlassWater, Sparkles, Tag, Wine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/app/_components/BackButton'
import { getIngredient } from './_lib/get-ingredient'
import { ExpandableDescription } from './_components/ExpandableDescription'
import { IngredientActions } from './_components/IngredientActions'

const DESCRIPTION_PREVIEW_LENGTH = 700
const GRADIENT = 'linear-gradient(270deg, var(--brand-gradient-from), var(--brand-gradient-to))'

/** Cuts at the last sentence end (or word) before `maxLength`. */
function smartSlice(text: string, maxLength = DESCRIPTION_PREVIEW_LENGTH) {
    if (text.length <= maxLength) return text
    const slice = text.slice(0, maxLength)
    const lastStop = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'))
    if (lastStop > 0) return slice.slice(0, lastStop + 1)
    const lastSpace = slice.lastIndexOf(' ')
    if (lastSpace > 0) return slice.slice(0, lastSpace) + '...'
    return slice + '...'
}

/**
 * Server Component (PERF-001): ingredient hero rendered in the initial HTML with
 * a preloaded image; data shared with generateMetadata through `cache()`.
 * Renders no `<main>` (owned by the (home) layout's AppShell).
 */
export default async function IngredientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const ingredient = await getIngredient(id)
    if (!ingredient) notFound()

    const usedIn = ingredient._count?.cocktailIngredients ?? 0

    return (
        <article style={{ background: GRADIENT }}>
            <section
                className="relative w-full md:pb-6"
                style={{ background: GRADIENT, minHeight: '475px' }}
            >
                <div className="md:hidden absolute left-4 top-[max(env(safe-area-inset-top),1rem)] z-20">
                    <BackButton
                        fallbackHref="/ingredients"
                        className="h-8 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-label uppercase tracking-widest border border-fg-on-brand/35 text-fg-on-brand bg-overlay/20 backdrop-blur-sm hover:bg-overlay/33 transition-colors"
                    />
                </div>
                <div className="max-w-7xl mx-auto px-4 md:flex md:gap-12 items-center">

                    {/* Image */}
                    <div className="md:w-1/2 flex justify-center">
                        <div className="mt-10 md:mt-20 md:-mb-24">
                            <Image
                                src={ingredient.imageUrl ?? '/placeholder.svg'}
                                alt={ingredient.name}
                                width={450}
                                height={450}
                                sizes="(min-width: 768px) 450px, 280px"
                                preload
                                className="object-cover rounded-sm w-[280px] h-[280px] md:w-[450px] md:h-[450px]"
                            />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="md:w-1/2 flex flex-col pb-8 md:pb-0 pt-10 md:pt-24 text-fg-on-brand">
                        <h1 className="font-serif italic font-semibold tracking-[.05em] text-3xl md:text-5xl mb-6">
                            {ingredient.name}
                        </h1>

                        <div className="flex flex-wrap gap-3 mb-6 text-sm ml-8">
                            {ingredient.type?.name && (
                                <Badge className="bg-surface/90 text-fg rounded-lg px-2">
                                    <Wine size={14} className="mr-1" aria-hidden="true" />
                                    {ingredient.type.name}
                                    {ingredient.subType?.name && <> – {ingredient.subType.name}</>}
                                </Badge>
                            )}
                            {ingredient.brand && (
                                <Badge className="bg-surface/90 text-fg rounded-lg px-2">
                                    <Tag size={14} className="mr-1" aria-hidden="true" />
                                    {ingredient.brand}
                                </Badge>
                            )}
                            {ingredient.abv != null && ingredient.abv !== 0 && (
                                <Badge className="bg-surface/90 text-fg rounded-lg px-2">
                                    <Droplets size={14} className="mr-1" aria-hidden="true" />
                                    {ingredient.abv}% ABV
                                </Badge>
                            )}
                            {ingredient.isAlcoholic != null && (
                                <Badge
                                    className={
                                        ingredient.isAlcoholic
                                            ? 'bg-missing-bg text-missing rounded-lg px-2'
                                            : 'bg-success-bg text-success rounded-lg px-2'
                                    }
                                >
                                    <Sparkles size={14} className="mr-1" aria-hidden="true" />
                                    {ingredient.isAlcoholic ? 'Alcoholic' : 'Non-Alcoholic'}
                                </Badge>
                            )}
                            {usedIn > 0 && (
                                <Badge className="bg-surface/90 text-fg rounded-lg px-2">
                                    <GlassWater size={14} className="mr-1" aria-hidden="true" />
                                    Used in {usedIn} {usedIn === 1 ? 'cocktail' : 'cocktails'}
                                </Badge>
                            )}
                        </div>

                        {ingredient.description && (
                            <ExpandableDescription
                                full={ingredient.description}
                                preview={smartSlice(ingredient.description)}
                            />
                        )}

                        <IngredientActions ingredientId={ingredient.id} ingredientName={ingredient.name} />
                    </div>
                </div>
            </section>
        </article>
    )
}
