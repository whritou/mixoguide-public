import { Skeleton } from '@/components/ui/skeleton'

export default function UserLoading() {
    return (
        <div className="px-4 md:px-12 py-16 max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-6">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-3">
                    <Skeleton className="h-6 w-48 rounded-lg" />
                    <Skeleton className="h-4 w-32 rounded-lg" />
                </div>
            </div>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
        </div>
    )
}
