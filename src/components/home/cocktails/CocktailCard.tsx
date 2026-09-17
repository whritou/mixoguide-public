'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Star, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useFavorites } from '@/hooks/useFavorite'
import { StarRatingDisplay } from '@/components/StarRating'
import type { Cocktail, MakeableCocktail, MakeableStatus } from '@/types/models/cocktail'

const STATUS_BADGE: Record<MakeableStatus, { dot: string; label: (c: MakeableCocktail) => string }> = {
    full:            { dot: 'bg-emerald-400', label: () => 'MAKEABLE' },
    withSubstitutes: { dot: 'bg-amber-400',   label: () => 'MAKEABLE' },
    withDerivates:   { dot: 'bg-amber-400',   label: () => 'MAKEABLE' },
    missing:         { dot: 'bg-orange-400',  label: (c) => c.missingIngredients[0] ? `NEED ${c.missingIngredients[0].name.toUpperCase()}` : 'MISSING' },
}

interface Props {
    cocktail: Cocktail
    makeable?: MakeableCocktail
    isNeverTried?: boolean
}

export function CocktailCard({ cocktail, makeable, isNeverTried }: Props) {
    const { isFavorite, toggle } = useFavorites()
    const fav = isFavorite(cocktail.id)

    const badge = makeable ? STATUS_BADGE[makeable.makeableStatus] : null

    const requiredCount = makeable?.requiredCount ?? 0
    const satisfiedCount = makeable
        ? requiredCount - makeable.missingCount
        : requiredCount

    const showIngCount = requiredCount > 0

    const missingAny = makeable && makeable.missingCount > 0

    const handleFav = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await toggle(cocktail.id)
            toast.success(fav ? 'Removed from favorites' : 'Added to favorites')
        } catch {
            toast.error('Could not update favorite status')
        }
    }

    return (
        <Link
            href={`/cocktails/${cocktail.id}`}
            className="group bg-white rounded-2xl overflow-hidden cursor-pointer shadow-xs hover:shadow-md transition-all duration-300 block"
        >
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                    src={cocktail.imageUrl ?? '/placeholder.svg'}
                    alt={cocktail.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className={`object-cover transition-transform duration-500 group-hover:scale-105 ${missingAny ? 'opacity-80' : ''}`}
                    loading="lazy"
                />

                {/* Status badge */}
                {badge && (
                    <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1.5 bg-mg-ink/75 backdrop-blur-sm text-white text-[10px] font-label uppercase tracking-widest px-2.5 py-1.5 rounded-full">
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label(makeable!)}
                        </span>
                    </div>
                )}

                {/* Favorite */}
                <button
                    type="button"
                    onClick={handleFav}
                    aria-label={fav ? `Remove ${cocktail.name} from favorites` : `Add ${cocktail.name} to favorites`}
                    aria-pressed={fav}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                >
                    <Star
                        size={14}
                        className={fav ? 'text-mg-caramel' : 'text-mg-muted'}
                        fill={fav ? 'currentColor' : 'none'}
                    />
                </button>
            </div>

            {/* Info */}
            <div className="p-4 space-y-1.5">
                <h3 className="font-headline text-lg text-mg-ink leading-tight line-clamp-1">
                    {cocktail.name}
                </h3>

                <div className="flex items-center gap-2 text-xs text-mg-muted flex-wrap">
                    {showIngCount && (
                        <span className={missingAny ? 'text-mg-caramel font-medium' : ''}>
                            {makeable
                                ? `${satisfiedCount} / ${requiredCount}`
                                : requiredCount
                            } ingredients
                        </span>
                    )}
                    {showIngCount && cocktail.preparationTime != null && (
                        <span className="text-mg-bone">·</span>
                    )}
                    {cocktail.preparationTime != null && (
                        <span>{cocktail.preparationTime} min</span>
                    )}
                    {isNeverTried && makeable?.makeableStatus === 'full' && (
                        <>
                            <span className="text-mg-bone">·</span>
                            <span className="flex items-center gap-1 text-mg-brown font-medium">
                                <Sparkles size={11} />
                                Never tried
                            </span>
                        </>
                    )}
                </div>

                <StarRatingDisplay avg={cocktail.avgRating} count={cocktail.ratingCount} size={12} />
                {/* FLAVORS */}
                {cocktail.flavors && cocktail.flavors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {cocktail.flavors.slice(0, 3).map((f) => (
                            <span
                                key={f}
                                className="text-[10px] font-label uppercase tracking-wider text-mg-brown bg-mg-caramel/10 px-2 py-0.5 rounded-full"
                            >
                                {f}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Link>
    )
}
