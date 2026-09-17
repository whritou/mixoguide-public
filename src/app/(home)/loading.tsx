import { Skeleton } from '@/components/ui/skeleton'

export default function HomeLoading() {
    return (
        <div className="bg-mg-cream min-h-screen">
            {/* Hero placeholder */}
            <Skeleton className="w-full h-[480px] rounded-none" />

            {/* KPI bar */}
            <div className="px-4 md:px-12 py-10 flex gap-6">
                <Skeleton className="h-24 flex-1 rounded-xl" />
                <Skeleton className="h-24 flex-1 rounded-xl" />
                <Skeleton className="h-24 flex-1 rounded-xl" />
            </div>

            {/* Body */}
            <div className="px-4 md:px-12 py-16 grid grid-cols-12 gap-12">
                <Skeleton className="col-span-3 h-96 rounded-xl" />
                <div className="col-span-9 space-y-8">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        </div>
    )
}
