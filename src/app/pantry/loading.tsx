import { Skeleton } from '@/components/ui/skeleton'

export default function PantryLoading() {
    return (
        <div className="bg-canvas min-h-screen px-4 md:px-12 py-10" aria-busy="true" aria-label="Loading pantry">
            <Skeleton className="h-9 w-56 rounded-lg mb-3" />
            <Skeleton className="h-4 w-36 rounded-lg mb-8" />
            <Skeleton className="h-12 w-full rounded-xl mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
            </div>
        </div>
    )
}
