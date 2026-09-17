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
        <div className="bg-white rounded-2xl shadow-xs p-6 mb-8">
            <h2 className="font-headline text-lg text-mg-ink mb-6">{title}</h2>
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={stopColor} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={stopColor} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e2df" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#81756a' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#81756a' }} />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e4e2df', fontSize: 12 }}
                        formatter={(v) => [v ?? 0, 'drinks']}
                    />
                    <Area type="monotone" dataKey="drinks" stroke={stroke} strokeWidth={2} fill={`url(#${gradientId})`} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
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
                stroke="#7a5830"
                stopColor="#bc9366"
            />
            <ActivityChart
                title="Monthly activity"
                data={monthlyTrend}
                gradientId="monthGrad"
                stroke="#bc9366"
                stopColor="#7a5830"
            />
        </>
    )
}
