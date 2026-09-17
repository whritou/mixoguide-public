'use client'

import dynamic from 'next/dynamic'
import {
    Martini,
    Cherry,
    Users,
    Star,
    CalendarCheck,
    GlassWater,
    Wrench,
    ListChecks,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminStatsQuery } from '@/hooks/queries/use-admin-stats'

const AdminDashboardCharts = dynamic(() => import('@/components/charts/AdminDashboardCharts'), {
    ssr: false,
    loading: () => <ChartsFallback />,
})

type KpiCardProps = {
    title: string
    value: number
    icon: React.ReactNode
}

function KpiCard({ title, value, icon }: KpiCardProps) {
    return (
        <Card className="border-stone-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-mg-brown/30">
            <CardContent className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-mg-brown/10 text-mg-brown">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-bold tracking-tight text-stone-900 tabular-nums">{value}</p>
                </div>
            </CardContent>
        </Card>
    )
}

function KpiSkeleton() {
    return (
        <Card className="border-stone-200">
            <CardContent className="flex items-center gap-4 pt-6">
                <Skeleton className="size-12 rounded-xl bg-stone-100" />
                <div className="space-y-2">
                    <Skeleton className="h-3 w-20 bg-stone-100" />
                    <Skeleton className="h-7 w-12 bg-stone-100" />
                </div>
            </CardContent>
        </Card>
    )
}

function ChartSkeleton() {
    return (
        <Card className="border-stone-200">
            <CardHeader>
                <Skeleton className="h-6 w-40 bg-stone-100" />
                <Skeleton className="h-4 w-56 bg-stone-100 mt-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[280px] w-full rounded-xl bg-stone-50" />
            </CardContent>
        </Card>
    )
}

function ChartsFallback() {
    return (
        <>
            {Array.from({ length: 4 }).map((_, i) => (
                <ChartSkeleton key={i} />
            ))}
        </>
    )
}

export default function AdminDashboard() {
    const { data: stats, isLoading: loading, isError: error } = useAdminStatsQuery()

    if (error) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center bg-stone-50 rounded-2xl">
                <p className="text-red-700 font-medium bg-red-50 px-4 py-2 rounded-lg">Failed to load dashboard data</p>
            </div>
        )
    }

    if (loading || !stats) {
        return (
            <div className="space-y-8 bg-[#faf9f8] min-h-screen p-6 rounded-2xl">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-stone-900">Dashboard</h1>
                    <p className="text-stone-500 text-sm mt-1">Overview of your MixoGuide data</p>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <KpiSkeleton key={i} />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <ChartSkeleton key={i} />
                    ))}
                </div>
            </div>
        )
    }

    const { counts } = stats


    return (
        <div className="space-y-8 min-h-screen p-6 rounded-2xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-stone-900">Dashboard</h1>
                <p className="text-stone-500 text-sm mt-1">Overview of your MixoGuide data</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <KpiCard title="Cocktails" value={counts.cocktails} icon={<Martini className="size-6" />} />
                <KpiCard title="Ingredients" value={counts.ingredients} icon={<Cherry className="size-6" />} />
                <KpiCard title="Users" value={counts.users} icon={<Users className="size-6" />} />
                <KpiCard title="Ratings" value={counts.ratings} icon={<Star className="size-6" />} />
                <KpiCard title="Planned" value={counts.plannedCocktails} icon={<CalendarCheck className="size-6" />} />
                <KpiCard title="Completed" value={counts.completedCocktails} icon={<ListChecks className="size-6" />} />
                <KpiCard title="Glasses" value={counts.glasses} icon={<GlassWater className="size-6" />} />
                <KpiCard title="Bar Tools" value={counts.barTools} icon={<Wrench className="size-6" />} />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <AdminDashboardCharts stats={stats} />

                {/* Recent Completions */}
                {stats.recentCompletions.length > 0 && (
                    <Card className="lg:col-span-2 border-stone-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-stone-900">Recent Completions</CardTitle>
                            <CardDescription className="text-stone-500">Latest cocktails marked as done</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-stone-100">
                                {stats.recentCompletions.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 transition-colors hover:bg-stone-50/50 rounded-lg px-2 -mx-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-stone-900">{c.cocktailName}</p>
                                            <p className="text-xs text-stone-500 mt-0.5">by {c.userName}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="inline-flex items-center rounded-full bg-mg-brown/10 px-2.5 py-0.5 text-xs font-medium text-mg-brown">
                                                Completed
                                            </span>
                                            <p className="text-xs text-stone-400 mt-1">
                                                {new Date(c.completedAt).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
