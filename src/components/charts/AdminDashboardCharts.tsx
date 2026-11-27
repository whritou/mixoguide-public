'use client'

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdminDashboardStats } from '@/services/admin-stats.service'
import { ChartDataTable } from './ChartDataTable'

const PRIMARY_ACCENT = 'var(--chart-1)'
const CHART_COLORS = [
    PRIMARY_ACCENT,
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--brand-soft)',
    'var(--chart-2)',
]

const DIFFICULTY_COLORS: Record<string, string> = {
    easy: 'var(--chart-2)',
    medium: PRIMARY_ACCENT,
    hard: 'var(--chart-3)',
    unknown: 'var(--chart-5)',
}

type TooltipPayload = {
    fullName?: string
    name?: string
    stars?: string
    rating?: number
    reviews?: number
    count?: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: TooltipPayload }> }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
        <div className="bg-surface border border-line rounded-lg px-4 py-3 shadow-lg">
            <p className="text-sm font-semibold text-fg">{d.fullName || d.name || d.stars}</p>
            <p className="text-fg-secondary text-xs mt-1">
                {d.rating
                    ? `${d.rating} / 5 - ${d.reviews} review${d.reviews !== 1 ? 's' : ''}`
                    : d.count
                        ? `${d.count} item${d.count !== 1 ? 's' : ''}`
                        : `${payload[0].value} item${payload[0].value !== 1 ? 's' : ''}`}
            </p>
        </div>
    )
}

export default function AdminDashboardCharts({ stats }: { stats: AdminDashboardStats }) {
    const alcoholData = [
        { name: 'Alcoholic', value: stats.alcoholDistribution.alcoholic, fill: CHART_COLORS[0] },
        { name: 'Non-Alcoholic', value: stats.alcoholDistribution.nonAlcoholic, fill: CHART_COLORS[4] },
    ]

    const difficultyData = stats.difficultyDistribution.map((d) => ({
        name: d.difficulty.charAt(0).toUpperCase() + d.difficulty.slice(1),
        value: d.count,
        fill: DIFFICULTY_COLORS[d.difficulty] ?? CHART_COLORS[4],
    }))

    const techniqueData = stats.techniqueDistribution.map((t) => ({
        name: t.technique.charAt(0).toUpperCase() + t.technique.slice(1),
        count: t.count,
    }))

    const bestRatedData = stats.bestRated.map((c) => ({
        name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
        fullName: c.name,
        rating: Number(c.avgRating.toFixed(2)),
        reviews: c.ratingCount,
    }))

    const ratingsData = stats.ratingsDistribution.map((r) => ({
        stars: `${r.rating}*`,
        count: r.count,
    }))

    return (
        <>
            {bestRatedData.length > 0 && (
                <Card className="lg:col-span-2 border-line shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-fg">Best Rated Cocktails</CardTitle>
                        <CardDescription className="text-fg-muted">Top 10 by average rating (min. 1 review)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[340px] pt-4">
                        <div aria-hidden="true" className="h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bestRatedData} margin={{ bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                                <XAxis
                                    dataKey="name"
                                    angle={-35}
                                    textAnchor="end"
                                    interval={0}
                                    tick={{ fill: 'var(--fg-muted)', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'var(--line-strong)' }}
                                />
                                <YAxis domain={[0, 5]} tick={{ fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                                <Bar dataKey="rating" fill={PRIMARY_ACCENT} radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                        </div>
                        <ChartDataTable caption="Best rated cocktails" columns={['Cocktail', 'Average rating', 'Reviews']} rows={bestRatedData.map((d) => [d.fullName, d.rating, d.reviews])} />
                    </CardContent>
                </Card>
            )}

            <Card className="border-line shadow-sm">
                <CardHeader>
                    <CardTitle className="text-fg">Alcohol Distribution</CardTitle>
                    <CardDescription className="text-fg-muted">Alcoholic vs non-alcoholic cocktails</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <div aria-hidden="true" className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={alcoholData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                stroke="var(--surface)" strokeWidth={2}
                            >
                                {alcoholData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '14px', color: 'var(--fg-secondary)' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    </div>
                    <ChartDataTable caption="Alcohol distribution" columns={['Type', 'Cocktails']} rows={alcoholData.map((d) => [d.name, d.value])} />
                </CardContent>
            </Card>

            <Card className="border-line shadow-sm">
                <CardHeader>
                    <CardTitle className="text-fg">Difficulty Breakdown</CardTitle>
                    <CardDescription className="text-fg-muted">Cocktails by difficulty level</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <div aria-hidden="true" className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={difficultyData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                stroke="var(--surface)" strokeWidth={2}
                            >
                                {difficultyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '14px', color: 'var(--fg-secondary)' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    </div>
                    <ChartDataTable caption="Difficulty breakdown" columns={['Difficulty', 'Cocktails']} rows={difficultyData.map((d) => [d.name, d.value])} />
                </CardContent>
            </Card>

            <Card className="border-line shadow-sm">
                <CardHeader>
                    <CardTitle className="text-fg">Ratings Distribution</CardTitle>
                    <CardDescription className="text-fg-muted">Number of ratings per star level</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-4">
                    <div aria-hidden="true" className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ratingsData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                            <XAxis dataKey="stars" tick={{ fill: 'var(--fg-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--line-strong)' }} />
                            <YAxis allowDecimals={false} tick={{ fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                            <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                    <ChartDataTable caption="Ratings distribution" columns={['Stars', 'Ratings']} rows={stats.ratingsDistribution.map((r) => [`${r.rating} star${r.rating === 1 ? '' : 's'}`, r.count])} />
                </CardContent>
            </Card>

            <Card className="border-line shadow-sm">
                <CardHeader>
                    <CardTitle className="text-fg">Top Ingredients</CardTitle>
                    <CardDescription className="text-fg-muted">Most used across all cocktails</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-4">
                    <div aria-hidden="true" className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={stats.topIngredients}
                            layout="vertical"
                            margin={{ left: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
                            <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={100}
                                tick={{ fill: 'var(--fg-muted)', fontSize: 12 }}
                                tickLine={false}
                                axisLine={{ stroke: 'var(--line-strong)' }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                            <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                    <ChartDataTable caption="Top ingredients" columns={['Ingredient', 'Cocktails']} rows={stats.topIngredients.map((d) => [d.name, d.count])} />
                </CardContent>
            </Card>

            {techniqueData.length > 0 && (
                <Card className="lg:col-span-2 border-line shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-fg">Techniques</CardTitle>
                        <CardDescription className="text-fg-muted">Cocktail preparation techniques used</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px] pt-4">
                        <div aria-hidden="true" className="h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={techniqueData} margin={{ bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                                <XAxis
                                    dataKey="name"
                                    angle={-30}
                                    textAnchor="end"
                                    interval={0}
                                    tick={{ fill: 'var(--fg-muted)', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'var(--line-strong)' }}
                                />
                                <YAxis allowDecimals={false} tick={{ fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                                <Bar dataKey="count" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                        </div>
                        <ChartDataTable caption="Techniques" columns={['Technique', 'Cocktails']} rows={techniqueData.map((d) => [d.name, d.count])} />
                    </CardContent>
                </Card>
            )}
        </>
    )
}
