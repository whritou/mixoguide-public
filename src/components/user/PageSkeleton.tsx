export function PageSkeleton() {
    return (
        <div className="bg-canvas min-h-screen px-4 md:px-12 py-12 max-w-3xl mx-auto space-y-8 animate-pulse">
            <div className="flex gap-6 items-end">
                <div className="w-24 h-24 rounded-full bg-line" />
                <div className="space-y-2 flex-1">
                    <div className="h-7 w-48 bg-line rounded-xl" />
                    <div className="h-4 w-32 bg-line rounded-xl" />
                </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-line rounded-2xl" />)}
            </div>
            <div className="h-48 bg-line rounded-2xl" />
        </div>
    )
}
