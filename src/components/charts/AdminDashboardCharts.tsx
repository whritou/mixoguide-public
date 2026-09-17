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

const PRIMARY_ACCENT = '#7a5830'
const CHART_COLORS = [
    PRIMARY_ACCENT,
    '#9a7b56',
    '#4a3b2c',
    '#bda588',
    '#6a7062',
]

const DIFFICULTY_COLORS: Record<string, string> = {
    easy: '#bda588',
    medium: PRIMARY_ACCENT,
    hard: '#4a3b2c',
    unknown: '#d6d3d1',
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
        <div className="bg-white border border-stone-200 rounded-lg px-4 py-3 shadow-lg">
            <p className="text-sm font-semibold text-stone-900">{d.fullName || d.name || d.stars}</p>
            <p className="text-stone-600 text-xs mt-1">
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
        { name: 'Non-Alcoholic', value: stats.alcoholDistribution.nonAlcoholic, fill: CHART_COLORS[3] },
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
                <Card className="lg:col-span-2 border-stone-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-stone-900">Best Rated Cocktails</CardTitle>
                        <CardDescription className="text-stone-500">Top 10 by average rating (min. 1 review)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[340px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bestRatedData} margin={{ bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                                <XAxis
                                    dataKey="name"
                                    angle={-35}
                                    textAnchor="end"
                                    interval={0}
                                    tick={{ fill: '#78716c', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#d6d3d1' }}
                                />
                                <YAxis domain={[0, 5]} tick={{ fill: '#78716c' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f4' }} />
                                <Bar dataKey="rating" fill={PRIMARY_ACCENT} radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            <Card className="border-stone-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-stone-900">Alcohol Distribution</CardTitle>
                    <CardDescription className="text-stone-500">Alcoholic vs non-alcoholic cocktails</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
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
                                stroke="none"
                            >
                                {alcoholData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '14px', color: '#44403c' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="border-stone-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-stone-900">Difficulty Breakdown</CardTitle>
                    <CardDescription className="text-stone-500">Cocktails by difficulty level</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
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
                                stroke="none"
                            >
                                {difficultyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '14px', color: '#44403c' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="border-stone-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-stone-900">Ratings Distribution</CardTitle>
                    <CardDescription className="text-stone-500">Number of ratings per star level</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ratingsData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                            <XAxis dataKey="stars" tick={{ fill: '#78716c' }} tickLine={false} axisLine={{ stroke: '#d6d3d1' }} />
                            <YAxis allowDecimals={false} tick={{ fill: '#78716c' }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f4' }} />
                            <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="border-stone-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-stone-900">Top Ingredients</CardTitle>
                    <CardDescription className="text-stone-500">Most used across all cocktails</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={stats.topIngredients}
                            layout="vertical"
                            margin={{ left: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e5e4" />
                            <XAxis type="number" allowDecimals={false} tick={{ fill: '#78716c' }} tickLine={false} axisLine={false} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={100}
                                tick={{ fill: '#78716c', fontSize: 12 }}
                                tickLine={false}
                                axisLine={{ stroke: '#d6d3d1' }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f4' }} />
                            <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {techniqueData.length > 0 && (
                <Card className="lg:col-span-2 border-stone-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-stone-900">Techniques</CardTitle>
                        <CardDescription className="text-stone-500">Cocktail preparation techniques used</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={techniqueData} margin={{ bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                                <XAxis
                                    dataKey="name"
                                    angle={-30}
                                    textAnchor="end"
                                    interval={0}
                                    tick={{ fill: '#78716c', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#d6d3d1' }}
                                />
                                <YAxis allowDecimals={false} tick={{ fill: '#78716c' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f4' }} />
                                <Bar dataKey="count" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </>
    )
}
