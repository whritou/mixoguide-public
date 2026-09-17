import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Ingredients",
    description: "Explore our complete ingredient library. Search spirits, mixers, bitters, and garnishes to discover what cocktails you can make with what you have.",
    openGraph: {
        title:       "Ingredients | MixoGuide",
        description: "Explore our complete ingredient library. Search spirits, mixers, bitters, and garnishes to discover what cocktails you can make with what you have.",
    },
    twitter: {
        title:       "Ingredients | MixoGuide",
        description: "Explore our complete ingredient library. Search spirits, mixers, bitters, and garnishes to discover what cocktails you can make with what you have.",
    },
}

export default function IngredientsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
