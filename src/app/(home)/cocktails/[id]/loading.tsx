import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors the detail layout (hero card + recipe column) to avoid layout shift. */
export default function CocktailDetailLoading() {
    return (
        <div className="min-h-screen bg-canvas px-4 md:px-10 pt-8 pb-40 md:pb-8" aria-busy="true" aria-label="Loading cocktail">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 rounded-2xl overflow-hidden border border-line bg-surface">
                <Skeleton className="h-[520px] rounded-none" />
                <div className="p-10 flex flex-col gap-4">
                    <Skeleton className="h-7 w-40 rounded-lg" />
                    {Array.from({ length: 5 }, (_, i) => (
                        <Skeleton key={i} className="h-12 rounded-lg" />
                    ))}
                    <Skeleton className="h-7 w-32 rounded-lg mt-4" />
                    <Skeleton className="h-24 rounded-lg" />
                </div>
            </div>
        </div>
    )
}
