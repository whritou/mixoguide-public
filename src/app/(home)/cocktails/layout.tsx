import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Cocktails",
    description: "Browse our full collection of cocktail recipes. Filter by ingredients, flavours, occasions, and techniques to find your perfect drink.",
    openGraph: {
        title:       "Cocktails | MixoGuide",
        description: "Browse our full collection of cocktail recipes. Filter by ingredients, flavours, occasions, and techniques to find your perfect drink.",
    },
    twitter: {
        title:       "Cocktails | MixoGuide",
        description: "Browse our full collection of cocktail recipes. Filter by ingredients, flavours, occasions, and techniques to find your perfect drink.",
    },
}

export default function CocktailsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
