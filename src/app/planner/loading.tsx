import { Skeleton } from '@/components/ui/skeleton'

export default function PlannerLoading() {
    return (
        <div className="bg-canvas min-h-screen px-4 md:px-12 py-10" aria-busy="true" aria-label="Loading planner">
            <Skeleton className="h-9 w-64 rounded-lg mb-3" />
            <Skeleton className="h-4 w-40 rounded-lg mb-8" />
            <div className="flex gap-2 mb-8">
                <Skeleton className="h-9 w-28 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
            </div>
        </div>
    )
}
