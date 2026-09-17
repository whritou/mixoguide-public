'use client'

import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { Flame, CalendarDays, Trophy, GlassWater } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import Loader from '@/components/ui/Loader'
import { useUserStatsQuery } from '@/hooks/queries/use-user-stats'

const StatsActivityCharts = dynamic(() => import('@/components/charts/StatsActivityCharts'), {
    ssr: false,
    loading: () => <ChartFallback />,
})

export default function StatsClientView() {
    const { status } = useSession()
    const { data: stats, isLoading } = useUserStatsQuery({ enabled: status === 'authenticated' })

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen bg-mg-cream flex items-center justify-center">
                <Loader />
            </div>
        )
    }

    if (!stats) return null

    const hasActivity = stats.allTime > 0

    return (
        <div className="min-h-screen bg-mg-cream pb-20">
            <div className="max-w-4xl mx-auto px-6 md:px-12 py-12">

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="font-headline text-4xl text-mg-ink mb-2">My Stats</h1>
                    <p className="text-mg-charcoal font-body text-sm">Your cocktail-making history at a glance.</p>
                </div>

                {!hasActivity ? (
                    <EmptyState />
                ) : (
                    <>
                        {/* ── KPI Cards ──────────────────────────────── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                            <KpiCard icon={<GlassWater size={20} />} label="This week"  value={stats.thisWeek}  />
                            <KpiCard icon={<CalendarDays size={20} />} label="This month" value={stats.thisMonth} />
                            <KpiCard icon={<Trophy size={20} />}       label="This year"  value={stats.thisYear}  />
                            <KpiCard icon={<Flame size={20} />}        label="All time"   value={stats.allTime}   />
                        </div>

                        {/* ── Streaks ─────────────────────────────────── */}
                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <StreakCard label="Current streak" days={stats.currentStreak} />
                            <StreakCard label="Longest streak" days={stats.longestStreak} highlight />
                        </div>
                        <StatsActivityCharts weeklyTrend={stats.weeklyTrend} monthlyTrend={stats.monthlyTrend} />

                        {/* ── Top cocktails ───────────────────────────── */}
                        {stats.topCocktails.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-xs p-6">
                                <h2 className="font-headline text-lg text-mg-ink mb-6">Most made</h2>
                                <div className="space-y-3">
                                    {stats.topCocktails.map((c, i) => {
                                        const content = (
                                            <>
                                                <span className="text-sm font-label text-mg-caramel w-5 text-center">
                                                    {i + 1}
                                                </span>
                                                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                                                    <Image
                                                        src={c.imageUrl ?? '/placeholder.svg'}
                                                        alt={c.name}
                                                        width={40} height={40}
                                                        className="object-cover w-full h-full"
                                                    />
                                                </div>
                                                <span className="flex-1 font-body text-mg-ink group-hover:text-mg-brown transition-colors">
                                                    {c.name}
                                                </span>
                                                {c.archived && (
                                                    <span className="rounded-full bg-mg-sand px-2 py-0.5 text-[10px] font-label uppercase tracking-widest text-mg-muted">
                                                        Archived
                                                    </span>
                                                )}
                                                <span className="text-sm font-label text-mg-muted">
                                                    ×{c.count}
                                                </span>
                                            </>
                                        )

                                        return c.archived ? (
                                            <div
                                                key={c.cocktailId}
                                                className="flex items-center gap-4 p-3 rounded-xl opacity-90"
                                            >
                                                {content}
                                            </div>
                                        ) : (
                                            <Link
                                                key={c.cocktailId}
                                                href={`/cocktails/${c.cocktailId}`}
                                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-mg-smoke transition-colors group"
                                            >
                                                {content}
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="bg-white rounded-2xl shadow-xs p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-mg-caramel">{icon}</div>
            <p className="text-2xl font-headline text-mg-ink">{value}</p>
            <p className="text-xs font-label uppercase tracking-widest text-mg-muted">{label}</p>
        </div>
    )
}

function StreakCard({ label, days, highlight }: { label: string; days: number; highlight?: boolean }) {
    return (
        <div className={`rounded-2xl shadow-xs p-5 flex items-center gap-4 ${highlight ? 'bg-gradient-to-br from-mg-brown to-mg-caramel text-white' : 'bg-white'}`}>
            <Flame size={28} className={highlight ? 'text-white/80' : 'text-mg-caramel'} />
            <div>
                <p className={`text-2xl font-headline ${highlight ? 'text-white' : 'text-mg-ink'}`}>
                    {days} {days === 1 ? 'day' : 'days'}
                </p>
                <p className={`text-xs font-label uppercase tracking-widest ${highlight ? 'text-white/70' : 'text-mg-muted'}`}>
                    {label}
                </p>
            </div>
        </div>
    )
}

function ChartFallback() {
    return (
        <>
            <div className="bg-white rounded-2xl shadow-xs p-6 mb-8">
                <div className="h-5 w-36 rounded bg-mg-sand mb-6" />
                <div className="h-[200px] rounded-xl bg-mg-smoke" />
            </div>
            <div className="bg-white rounded-2xl shadow-xs p-6 mb-8">
                <div className="h-5 w-36 rounded bg-mg-sand mb-6" />
                <div className="h-[200px] rounded-xl bg-mg-smoke" />
            </div>
        </>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-mg-sand flex items-center justify-center">
                <GlassWater size={28} className="text-mg-muted" />
            </div>
            <p className="text-mg-ink font-body font-medium">No cocktails logged yet.</p>
            <Link
                href="/makeable"
                className="mt-2 px-8 py-3 bg-gradient-to-br from-mg-brown to-mg-caramel text-white rounded-full
                           font-label text-xs uppercase tracking-widest hover:scale-[0.98] transition-transform"
            >
                Find something to make
            </Link>
        </div>
    )
}
