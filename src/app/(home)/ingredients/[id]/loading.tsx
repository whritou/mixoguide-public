import { Skeleton } from '@/components/ui/skeleton'

export default function IngredientDetailLoading() {
    return (
        <div
            className="w-full min-h-[475px]"
            style={{ background: 'linear-gradient(270deg, var(--brand-gradient-from), var(--brand-gradient-to))' }}
            aria-busy="true"
            aria-label="Loading ingredient"
        >
            <div className="max-w-7xl mx-auto px-4 md:flex md:gap-12 items-center">
                <div className="md:w-1/2 flex justify-center">
                    <Skeleton className="mt-10 md:mt-20 w-[280px] h-[280px] md:w-[450px] md:h-[450px] rounded-sm" />
                </div>
                <div className="md:w-1/2 flex flex-col gap-4 pb-8 pt-10 md:pt-24">
                    <Skeleton className="h-12 w-3/4 rounded-lg" />
                    <Skeleton className="h-6 w-1/2 rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </div>
            </div>
        </div>
    )
}
