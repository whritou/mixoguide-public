import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cocktailService } from '@/services/cocktail.service'

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params
    try {
        const cocktail = await cocktailService.getById(id)
        const raw = cocktail.description ?? ''
        const description = raw.length > 0
            ? raw.slice(0, 155) + (raw.length > 155 ? '…' : '')
            : `Discover the ${cocktail.name} cocktail — full recipe, ingredients, and preparation steps on MixoGuide.`
        return {
            title: cocktail.name,
            description,
            openGraph: {
                title:       `${cocktail.name} | MixoGuide`,
                description,
                ...(cocktail.imageUrl && {
                    images: [{ url: cocktail.imageUrl, alt: cocktail.name }],
                }),
            },
            twitter: {
                title:       `${cocktail.name} | MixoGuide`,
                description,
                ...(cocktail.imageUrl && { images: [cocktail.imageUrl] }),
            },
        }
    } catch {
        return { title: 'Cocktail' }
    }
}

export default function CocktailDetailLayout({ children }: { children: ReactNode }) {
    return <>{children}</>
}
