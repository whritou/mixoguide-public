'use client'

import type {Cocktail} from "@/types/models/cocktail";
import {StarRatingDisplay} from "@/components/StarRating";
import {useMemo} from "react";
import {Skeleton} from "@/components/ui/skeleton";
import Image from "next/image";
import { motion } from "motion/react";
import Link from "next/link";
import {useCocktailsQuery} from "@/hooks/queries/use-cocktails";

const MotionLink = motion(Link)

function RecommendationsCard({ cocktail, index }: { cocktail: Cocktail; index: number }) {
    const occasion = cocktail.occasions?.[0]?.replace(/_/g, ' ')
    const flavor = cocktail.flavors?.[0]

    return (
        <MotionLink
            href={`/cocktails/${cocktail.id}`}
            className="bg-mg-smoke p-4 rounded-xl group cursor-pointer block"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] as const }}
        >
            <div className="aspect-square rounded-lg overflow-hidden mb-4">
                <Image
                    src={cocktail.imageUrl ?? '/placeholder.svg'}
                    alt={cocktail.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    width={400}
                    height={400}
                />
            </div>
            <span className="font-label uppercase text-[10px] tracking-[0.2em] text-mg-dim">
                {[occasion, flavor].filter(Boolean).join(' \u00b7 ')}
            </span>
            <h3 className="font-headline text-lg mt-1 text-mg-ink">{cocktail.name}</h3>
            <StarRatingDisplay avg={cocktail.avgRating} count={cocktail.ratingCount} />
        </MotionLink>
    )
}

export function RecommendationsSection() {
    const { data, isLoading } = useCocktailsQuery({ limit: 6, page: 1 })

    const sorted = useMemo(() => {
        const list = data?.items ?? []
        return [...list].sort(
            (a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)
        )
    }, [data])

    if (isLoading) {
        return (
            <section>
                <Skeleton className="h-10 w-64 mb-8" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
                </div>
            </section>
        )
    }

    if (sorted.length === 0) return null

    return (
        <section>
            <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as const }}
            >
                <h2 className="font-headline text-3xl lg:text-4xl text-mg-ink mb-2">Curated Recommendations</h2>
                <p className="text-mg-charcoal font-body">Discover our top-rated cocktails and find your next favorite.</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {sorted.slice(0, 6).map((c, i) => <RecommendationsCard key={c.id} cocktail={c} index={i} />)}
            </div>
        </section>
    )
}
