import type {MakeableCocktail} from "@/types/models/cocktail";
import Link from 'next/link'
import Image from 'next/image'
import { Clock } from 'lucide-react'
import { StarRatingDisplay } from '@/components/StarRating'

function badgeForCocktail(c: MakeableCocktail): { label: string; dot: string } {
    if (c.makeableStatus === 'full') return { label: 'MAKEABLE', dot: 'bg-emerald-400' }
    if (c.makeableStatus === 'withSubstitutes' || c.makeableStatus === 'withDerivates')
        return { label: 'MAKEABLE', dot: 'bg-amber-400' }
    const missing = c.missingIngredients?.[0]?.name
    return { label: missing ? `NEED ${missing.toUpperCase()}` : 'MISSING', dot: 'bg-orange-400' }
}

/* ── Small cocktail card ─────────────────────────────────────── */
export function DashboardCocktailCard({ cocktail }: { cocktail: MakeableCocktail }) {
    const badge  = badgeForCocktail(cocktail)

    const capitalize = (str?: string) =>
        str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

    const occasion = capitalize(
        cocktail.occasions?.[0]?.replace(/_/g, ' ')
    );
    const flavor = capitalize(cocktail.flavors?.[0]);

    return (
        <Link
            href={`/cocktails/${cocktail.id}`}
            className="rounded-2xl overflow-hidden bg-white cursor-pointer hover:shadow-sm transition-all duration-300 group block"
        >
            <div className="relative aspect-[1] overflow-hidden">
                <Image
                    src={cocktail.imageUrl ?? '/placeholder.svg'}
                    alt={cocktail.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 bg-mg-ink/75 backdrop-blur-sm text-white text-[10px] font-label uppercase tracking-widest px-2.5 py-1.5 rounded-full">
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                    </span>
                </div>
            </div>
            <div className="p-3">
                <h3 className="font-headline text-md text-mg-ink leading-tight mb-1 line-clamp-1">
                    {cocktail.name}
                </h3>
                <StarRatingDisplay avg={cocktail.avgRating} count={cocktail.ratingCount} size={11} />
                <div className="flex gap-4 mt-1  text-xs text-mg-muted">
                    {cocktail.preparationTime && (
                        <span className="flex items-center gap-1">
                            <Clock size={14} /> {cocktail.preparationTime} min {" | "}
                            {[occasion, flavor].filter(Boolean).join(' \u00b7 ')}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    )
}
