'use client'

import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'
import { ArrowLeft, Droplets, Sparkles, Wine, Tag, MessageSquarePlus, GlassWater } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSession } from 'next-auth/react'
import AddPantryItemDialog from '@/components/home/pantry/dialog/AddPantryItemDialog'
import SuggestionDialog    from '@/components/home/suggestions/SuggestionDialog'
import { useIngredientQuery } from "@/hooks/queries/use-ingredients";
import {Button} from "@/components/ui/button";

export default function Page() {
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const { data: ingredient, isLoading, isError } = useIngredientQuery(id)
    const { data: session }       = useSession()
    const [openAdd,              setOpenAdd]              = useState(false)
    const [expanded,             setExpanded]             = useState(false)
    const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false)

    if (!ingredient || isLoading) return null

    const [from, to] = ['#7a5830', '#bc9366']

    function smartSlice(text: string, maxLength = 700) {
        if (text.length <= maxLength) return text;

        const slice = text.slice(0, maxLength);

        // Find last sentence ending
        const lastDot = slice.lastIndexOf('.');
        const lastExclamation = slice.lastIndexOf('!');
        const lastQuestion = slice.lastIndexOf('?');

        const lastStop = Math.max(lastDot, lastExclamation, lastQuestion);

        // If we found a sentence end, cut there
        if (lastStop > 0) {
            return slice.slice(0, lastStop + 1);
        }

        // Fallback: cut at last space (avoid breaking words)
        const lastSpace = slice.lastIndexOf(' ');
        if (lastSpace > 0) {
            return slice.slice(0, lastSpace) + '...';
        }

        return slice + '...';
    }

    const handleGoBack = () => {
        if (window.history.length > 1) {
            router.back()
            return
        }
        router.push('/ingredients')
    }

    if (isError) {
        return (
            <main style={{ background: `linear-gradient(270deg, ${from}, ${to})` }}>
                <div className="max-w-7xl mx-auto px-4 md:flex md:gap-12 items-center">
                    <div className="md:w-1/2 flex justify-center">
                        <div className="mt-10 md:mt-20 md:-mb-36">
                            <Button variant="outline" onClick={handleGoBack} size="sm" className="h-8 flex items-center gap-1.5 rounded-full text-xs font-label uppercase tracking-widest border-mg-sand text-mg-muted hover:bg-mg-linen hover:text-mg-charcoal hover:border-mg-caramel/40">
                                <ArrowLeft size={13} />
                                Go Back
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main style={{ background: `linear-gradient(270deg, ${from}, ${to})` }}>

            {/* ── Gradient hero ──────────────────────────────────────────── */}
            <section
                className="relative w-full md:pb-6"
                style={{ background: `linear-gradient(270deg, ${from}, ${to})`, minHeight: '475px' }}
            >
                <div className="md:hidden absolute left-4 top-[max(env(safe-area-inset-top),1rem)] z-20">
                    <button
                        onClick={handleGoBack}
                        className="h-8 inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-label uppercase tracking-widest border border-white/35 text-white bg-black/15 backdrop-blur-sm hover:bg-black/25 transition-colors"
                    >
                        <ArrowLeft size={13} />
                        Back
                    </button>
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
                                priority
                                className="object-cover rounded-sm w-[280px] h-[280px] md:w-[450px] md:h-[450px]"
                            />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="md:w-1/2 flex flex-col pb-8 md:pb-0 pt-10 md:pt-24 text-white">
                        <h1 className="font-serif italic font-semibold tracking-[.05em] text-3xl md:text-5xl mb-6">
                            {ingredient.name}
                        </h1>

                        <div className="flex flex-wrap gap-3 mb-6 text-sm ml-8">
                            {ingredient.type?.name && (
                                <Badge className="bg-white/90 text-black rounded-lg px-2">
                                    <Wine size={14} className="mr-1" />
                                    {ingredient.type.name}
                                    {ingredient.subType?.name && <> – {ingredient.subType.name}</>}
                                </Badge>
                            )}
                            {ingredient.brand && (
                                <Badge className="bg-white/90 text-black rounded-lg px-2">
                                    <Tag size={14} className="mr-1" />
                                    {ingredient.brand}
                                </Badge>
                            )}
                            {ingredient.abv != 0 && (
                                <Badge className="bg-white/90 text-black rounded-lg px-2">
                                    <Droplets size={14} className="mr-1" />
                                    {ingredient.abv}% ABV
                                </Badge>
                            )}
                            {ingredient.isAlcoholic != null && (
                                <Badge
                                    className={
                                        ingredient.isAlcoholic
                                            ? 'bg-red-200 text-red-800 rounded-lg px-2'
                                            : 'bg-green-200 text-green-800 rounded-lg px-2'
                                    }
                                >
                                    <Sparkles size={14} className="mr-1" />
                                    {ingredient.isAlcoholic ? 'Alcoholic' : 'Non-Alcoholic'}
                                </Badge>
                            )}
                            {ingredient._count?.cocktailIngredients != null && ingredient._count.cocktailIngredients > 0 && (
                                <Badge className="bg-white/90 text-black rounded-lg px-2">
                                    <GlassWater size={14} className="mr-1" />
                                    Used in {ingredient._count.cocktailIngredients} {ingredient._count.cocktailIngredients === 1 ? 'cocktail' : 'cocktails'}
                                </Badge>
                            )}
                        </div>

                        {ingredient.description && (
                            <div className="ml-8 mb-6 max-w-prose">
                                <p className="font-title">
                                    {expanded
                                        ? ingredient.description
                                        : smartSlice(ingredient.description)
                                    }
                                </p>

                                {ingredient.description.length > 700 && (
                                    <button
                                        onClick={() => setExpanded(prev => !prev)}
                                        className="mt-2 text-xs uppercase tracking-widest text-white/90 underline hover:text-white transition-colors"
                                    >
                                        {expanded ? 'Show less' : 'Read more'}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="ml-8 mt-2 flex flex-wrap gap-3">
                            <button
                                onClick={() => setOpenAdd(true)}
                                className="px-5 py-2 rounded-lg bg-white/90 hover:bg-white border border-white/60 text-mg-brown text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-mg-brown"
                            >
                                Add to pantry
                            </button>
                            <button
                                onClick={() => {
                                    if (!session?.user) {
                                        window.location.href = `/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`
                                        return
                                    }
                                    setSuggestionDialogOpen(true)
                                }}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg border border-white text-white hover:bg-white/15 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-mg-brown"
                            >
                                <MessageSquarePlus size={15} />
                                Suggest a change
                            </button>
                        </div>

                        <AddPantryItemDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={() => {}} />
                        <SuggestionDialog
                            open={suggestionDialogOpen}
                            onOpenChange={setSuggestionDialogOpen}
                            defaultType="MODIFY_INGREDIENT"
                            targetId={id}
                            targetName={ingredient.name}
                        />
                    </div>
                </div>
            </section>
        </main>
    )
}
