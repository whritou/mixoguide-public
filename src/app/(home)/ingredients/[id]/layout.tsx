import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getIngredient } from './_lib/get-ingredient'

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params
    try {
        const ingredient = await getIngredient(id)
        if (!ingredient) return { title: 'Ingredient' }
        const raw = ingredient.description ?? ''
        const description = raw.length > 0
            ? raw.slice(0, 155) + (raw.length > 155 ? '…' : '')
            : `Explore ${ingredient.name} — discover cocktails you can make with it and add it to your MixoGuide pantry.`
        return {
            title: ingredient.name,
            description,
            openGraph: {
                title:       `${ingredient.name} | MixoGuide`,
                description,
                ...(ingredient.imageUrl && {
                    images: [{ url: ingredient.imageUrl, alt: ingredient.name }],
                }),
            },
            twitter: {
                title:       `${ingredient.name} | MixoGuide`,
                description,
                ...(ingredient.imageUrl && { images: [ingredient.imageUrl] }),
            },
        }
    } catch {
        return { title: 'Ingredient' }
    }
}

export default function IngredientDetailLayout({ children }: { children: ReactNode }) {
    return <>{children}</>
}
