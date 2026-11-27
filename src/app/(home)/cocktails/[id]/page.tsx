import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BackButton } from '@/app/_components/BackButton'
import { getCocktail } from './_lib/get-cocktail'
import { CocktailRating } from './_components/CocktailRating'
import { CocktailPlanActions } from './_components/CocktailPlanActions'
import { CocktailIngredientsPanel } from './_components/CocktailIngredientsPanel'
import { WakeLock } from './_components/WakeLock'
import { formatLabel, metaChipClass, metaLabelClass, metaValueClass } from './_components/styles'

/**
 * Server Component (PERF-001): the hero, recipe and method are in the initial
 * HTML and the hero image is preloaded, so LCP no longer waits for hydration
 * plus a client API round trip. `getCocktail` is `cache()`d and shared with
 * `generateMetadata`, so a view costs one DB read. Per-user parts (rating,
 * plan/make actions, pantry status) are small client islands.
 *
 * Renders no `<main>`: the (home) layout's AppShell owns the landmark.
 */
export default async function CocktailDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const cocktail = await getCocktail(id)
    if (!cocktail) notFound()

    const tags = [
        ...(cocktail.flavors ?? []),
        ...(cocktail.occasions ?? []),
    ].map(formatLabel)
    const techniques = (cocktail.technique ?? []).map(formatLabel)
    const barTools = cocktail.barTools ?? []
    const ingredients = cocktail.ingredients ?? []

    return (
        <article className="min-h-screen bg-canvas px-4 md:px-10 pt-8 pb-40 md:pb-8">
            <WakeLock />
            <div className="md:hidden max-w-6xl mx-auto mb-4">
                <BackButton
                    fallbackHref="/cocktails"
                    className="h-8 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-label uppercase tracking-widest border border-line text-fg-muted bg-surface/85 hover:bg-surface-subtle hover:text-fg-secondary hover:border-brand-soft/40 transition-colors"
                />
            </div>
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 rounded-2xl overflow-hidden border border-line bg-surface">

                {/* ── LEFT ───────────────────────────────────────────── */}
                <div className="relative flex flex-col justify-between p-14 text-fg-on-image bg-[linear-gradient(165deg,#2a1e12,#5a3820)] overflow-hidden">

                    <div className="absolute right-[-120px] top-[-120px] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(216,150,90,0.55),transparent_60%)]" />

                    {cocktail.imageUrl && (
                        <Image
                            src={cocktail.imageUrl}
                            alt=""
                            fill
                            sizes="(min-width: 768px) 50vw, 100vw"
                            className="object-cover opacity-20"
                            preload
                        />
                    )}

                    <div className="relative z-10 flex flex-col gap-6 h-full">

                        <div>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-fg-on-image/80 font-mono">
                                {cocktail.origin ?? cocktail.difficulty}
                            </p>

                            <h1 className="font-serif text-[64px] leading-none font-light tracking-[-0.02em] mt-3">
                                <em className="text-[#d9b384] not-italic">{cocktail.name}</em>
                            </h1>

                            {cocktail.description && (
                                <p className="mt-4 text-sm text-fg-on-image/90">
                                    {cocktail.description}
                                </p>
                            )}
                        </div>

                        {tags.length > 0 && (
                            <ul className="flex flex-wrap gap-2" aria-label="Flavours and occasions">
                                {tags.slice(0, 6).map((t, i) => (
                                    <li key={i} className="px-3 py-1 text-xs rounded-full bg-fg-on-image/10">
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <CocktailRating
                            cocktailId={cocktail.id}
                            initialAvg={cocktail.avgRating ?? null}
                            initialCount={cocktail.ratingCount ?? 0}
                        />

                        {/* specs */}
                        <div className="flex flex-wrap gap-x-7 gap-y-4 pt-5 border-t border-fg-on-image/15">
                            {cocktail.preparationTime != null && cocktail.preparationTime > 0 && (
                                <div>
                                    <span className={metaLabelClass}>Time</span>
                                    <div className={metaValueClass}>{cocktail.preparationTime} min</div>
                                </div>
                            )}
                            {cocktail.difficulty && (
                                <div>
                                    <span className={metaLabelClass}>Difficulty</span>
                                    <div className={metaValueClass}>{formatLabel(cocktail.difficulty)}</div>
                                </div>
                            )}
                            {cocktail.glass?.name && (
                                <div>
                                    <span className={metaLabelClass}>Glass</span>
                                    <div className={metaValueClass}>{cocktail.glass.name}</div>
                                </div>
                            )}
                        </div>

                        {(techniques.length > 0 || barTools.length > 0) && (
                            <div className="grid gap-4 pt-5 border-t border-fg-on-image/15 md:grid-cols-2">
                                {techniques.length > 0 && (
                                    <section aria-labelledby="cocktail-techniques">
                                        <h2 id="cocktail-techniques" className={`mb-2 ${metaLabelClass}`}>
                                            Technique{techniques.length === 1 ? '' : 's'}
                                        </h2>
                                        <div className="flex flex-wrap gap-1.5">
                                            {techniques.map((technique) => (
                                                <span key={technique} className={metaChipClass}>
                                                    {technique}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {barTools.length > 0 && (
                                    <section aria-labelledby="cocktail-bar-tools">
                                        <h2 id="cocktail-bar-tools" className={`mb-2 ${metaLabelClass}`}>
                                            Bar tools
                                        </h2>
                                        <div className="flex flex-wrap gap-1.5">
                                            {barTools.map(({ barTool }) => (
                                                <span key={barTool.id} className={`inline-flex items-center gap-1.5 ${metaChipClass}`}>
                                                    {barTool.name}
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}

                        <CocktailPlanActions cocktailId={cocktail.id} cocktailName={cocktail.name} />
                    </div>
                </div>

                {/* ── RIGHT ──────────────────────────────────────────── */}
                <div className="p-10 flex flex-col gap-6">
                    <CocktailIngredientsPanel cocktailId={cocktail.id} ingredients={ingredients} />

                    {cocktail.instructions && cocktail.instructions.length > 0 && (
                        <section aria-labelledby="cocktail-method">
                            <h2 id="cocktail-method" className="font-serif text-xl mb-4">Method</h2>
                            <ol className="flex flex-col gap-4">
                                {cocktail.instructions.map((step, i) => (
                                    <li key={i} className="flex gap-4">
                                        <span className="text-brand font-mono" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                                        <p>{step}</p>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}
                </div>
            </div>
        </article>
    )
}
