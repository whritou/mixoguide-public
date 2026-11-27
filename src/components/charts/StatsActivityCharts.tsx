'use client'

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import type { UserStatsPayload } from '@/lib/api/user-stats.api'
import { ChartDataTable } from './ChartDataTable'

type Trend = UserStatsPayload['weeklyTrend']

type ActivityChartProps = {
    title: string
    data: Trend
    gradientId: string
    stroke: string
    stopColor: string
}

function ActivityChart({ title, data, gradientId, stroke, stopColor }: ActivityChartProps) {
    return (
        <figure className="bg-surface rounded-2xl shadow-xs p-6 mb-8">
            <h2 className="font-headline text-lg text-fg mb-6">{title}</h2>
            <figcaption className="sr-only">
                {title}: drinks made per period. {data.reduce((n, d) => n + (Number(d.drinks) || 0), 0)} in total.
            </figcaption>
            <div aria-hidden="true">
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={stopColor} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={stopColor} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--line-strong)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--line-strong)' }} />
                    <Tooltip
                        cursor={{ stroke: 'var(--line-strong)' }}
                        contentStyle={{ borderRadius: '8px', background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--line)', fontSize: 12 }}
                        labelStyle={{ color: 'var(--fg)' }}
                        itemStyle={{ color: 'var(--fg-secondary)' }}
                        formatter={(v) => [v ?? 0, 'drinks']}
                    />
                    <Area type="monotone" dataKey="drinks" stroke={stroke} strokeWidth={2} activeDot={{ stroke: 'var(--surface)', fill: 'var(--brand)' }} fill={`url(#${gradientId})`} />
                </AreaChart>
            </ResponsiveContainer>
            </div>
            <ChartDataTable
                caption={title}
                columns={['Period', 'Drinks']}
                rows={data.map((d) => [d.label, d.drinks ?? 0])}
            />
        </figure>
    )
}

export default function StatsActivityCharts({
    weeklyTrend,
    monthlyTrend,
}: Pick<UserStatsPayload, 'weeklyTrend' | 'monthlyTrend'>) {
    return (
        <>
            <ActivityChart
                title="Weekly activity"
                data={weeklyTrend}
                gradientId="drinkGrad"
                stroke="var(--brand)"
                stopColor="var(--brand-soft)"
            />
            <ActivityChart
                title="Monthly activity"
                data={monthlyTrend}
                gradientId="monthGrad"
                stroke="var(--brand-soft)"
                stopColor="var(--brand)"
            />
        </>
    )
}
