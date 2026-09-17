'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Sparkles, Heart, Sun, Snowflake, Coffee, Leaf, Moon, Flame, ChevronRight, Wand2 } from 'lucide-react'
import { useSmartCollectionsQuery, type SmartCollection } from '@/hooks/queries/use-smart-collections'
import CreatePlannedCollectionDialog from '@/components/home/planned-cocktails/dialog/CreatePlannedCollectionDialog'

const ICON_MAP = {
    sparkles:  Sparkles,
    heart:     Heart,
    sun:       Sun,
    snowflake: Snowflake,
    coffee:    Coffee,
    leaf:      Leaf,
    moon:      Moon,
    flame:     Flame,
} as const

const ACCENT_BG: Record<SmartCollection['accent'], string> = {
    caramel: 'from-mg-caramel/30 to-mg-caramel/10',
    brown:   'from-mg-brown/30 to-mg-brown/10',
    amber:   'from-amber-300/30 to-amber-300/10',
    ink:     'from-mg-ink/30 to-mg-ink/10',
    rose:    'from-rose-300/30 to-rose-300/10',
    sage:    'from-emerald-300/30 to-emerald-300/10',
}

const ACCENT_RING: Record<SmartCollection['accent'], string> = {
    caramel: 'bg-mg-caramel/15 text-mg-brown',
    brown:   'bg-mg-brown/15 text-mg-brown',
    amber:   'bg-amber-200/40 text-amber-800',
    ink:     'bg-mg-ink/15 text-mg-ink',
    rose:    'bg-rose-200/40 text-rose-700',
    sage:    'bg-emerald-200/40 text-emerald-800',
}

function isoFromDayOffset(offset: number): string {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day   = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
}

interface Props {
    /** When true, render a hero/CTA variant for users with no collections. */
    asCta?:    boolean
    onCreated: () => void
}

export default function SmartCollectionsSection({ asCta = false, onCreated }: Props) {
    const { data, isLoading } = useSmartCollectionsQuery()
    const [active, setActive] = useState<SmartCollection | null>(null)

    const themes = useMemo(
        () => (data ?? []).filter(t => t.cocktails.length > 0),
        [data],
    )

    if (isLoading) {
        return (
            <section className={asCta ? 'py-6' : 'mt-8'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-36 rounded-2xl bg-mg-sand/40 animate-pulse" />
                    ))}
                </div>
            </section>
        )
    }

    if (themes.length === 0) return null

    return (
        <>
        <section className={asCta ? 'space-y-4' : 'mt-10 space-y-4'}>
            <header className="flex items-end justify-between gap-3">
                <div>
                    <p className="text-[10px] font-label uppercase tracking-widest text-mg-brown flex items-center gap-1.5">
                        <Wand2 size={11} />
                        Smart collections
                    </p>
                    <h2 className="font-headline italic text-2xl text-mg-ink leading-tight mt-0.5">
                        {asCta ? 'Start with a curated theme' : 'Need an idea? Try one of these'}
                    </h2>
                    {asCta && (
                        <p className="text-sm text-mg-muted mt-1">
                            Hand-picked cocktails grouped by vibe — open a theme, tweak the lineup, and plan it.
                        </p>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {themes.map(theme => {
                    const Icon = ICON_MAP[theme.icon] ?? Sparkles
                    return (
                        <button
                            key={theme.slug}
                            type="button"
                            onClick={() => setActive(theme)}
                            className={`group relative overflow-hidden rounded-2xl border border-mg-sand bg-gradient-to-br ${ACCENT_BG[theme.accent]} p-4 text-left transition-transform hover:-translate-y-0.5`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${ACCENT_RING[theme.accent]}`}>
                                        <Icon size={16} />
                                    </div>
                                    <h3 className="font-headline italic text-lg text-mg-ink mt-3">{theme.title}</h3>
                                    <p className="text-xs text-mg-muted mt-1 line-clamp-2">{theme.subtitle}</p>
                                </div>
                                <ChevronRight size={16} className="text-mg-muted shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
                            </div>

                            {theme.cocktails.length > 0 && (
                                <div className="mt-4 flex -space-x-2">
                                    {theme.cocktails.slice(0, 4).map(c => (
                                        <div
                                            key={c.id}
                                            className="relative h-8 w-8 rounded-full border-2 border-mg-cream bg-mg-sand overflow-hidden shrink-0"
                                            title={c.name}
                                        >
                                            {c.imageUrl ? (
                                                <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="32px" />
                                            ) : (
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-headline italic text-mg-brown">
                                                    {c.name.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {theme.cocktailCount > 4 && (
                                        <div className="relative h-8 w-8 rounded-full border-2 border-mg-cream bg-mg-cream flex items-center justify-center text-[10px] font-label text-mg-muted">
                                            +{theme.cocktailCount - 4}
                                        </div>
                                    )}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        </section>

        {active && (
            <CreatePlannedCollectionDialog
                onClose={() => setActive(null)}
                onCreated={() => { setActive(null); onCreated() }}
                initialTitle={active.title}
                initialDate={isoFromDayOffset(active.defaultDayOffset)}
                initialOccasions={active.occasions}
                initialServings={active.defaultServings}
                initialCocktails={active.cocktails.map(c => ({ id: c.id, name: c.name }))}
            />
        )}
        </>
    )
}
