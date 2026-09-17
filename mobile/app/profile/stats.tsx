import type { ComponentProps } from 'react'
import { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, type DimensionValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useUserStats } from '@/features/profile/hooks'
import { C, F, toneForId } from '@/theme/brand'
import type { UserStats } from '@/api/endpoints/user'

type IconName = ComponentProps<typeof Ionicons>['name']
type TrendMode = 'weekly' | 'monthly'

type TrendPoint = { label: string; drinks: number }

export default function StatsScreen() {
    const insets = useSafeAreaInsets()
    const { data: stats, isLoading, refetch, isRefetching } = useUserStats()
    const [trendMode, setTrendMode] = useState<TrendMode>('weekly')

    const derived = useMemo(() => {
        if (!stats) return null

        const activeWeeks = stats.weeklyTrend.filter(point => point.drinks > 0).length
        const totalWeekly = stats.weeklyTrend.reduce((sum, point) => sum + point.drinks, 0)
        const avgWeekly = stats.weeklyTrend.length > 0 ? totalWeekly / stats.weeklyTrend.length : 0
        const bestWeeklyPoint = stats.weeklyTrend.reduce<TrendPoint | null>((best, point) => {
            if (!best || point.drinks > best.drinks) return point
            return best
        }, null)
        const previousWeek = stats.weeklyTrend.length > 1 ? stats.weeklyTrend[stats.weeklyTrend.length - 2].drinks : 0
        const previousMonth = stats.monthlyTrend.length > 1 ? stats.monthlyTrend[stats.monthlyTrend.length - 2].drinks : 0
        const consistency = stats.weeklyTrend.length > 0
            ? Math.round((activeWeeks / stats.weeklyTrend.length) * 100)
            : 0

        return {
            avgWeekly,
            bestWeeklyPoint,
            previousWeek,
            previousMonth,
            consistency,
        }
    }, [stats])

    const trendData: TrendPoint[] = stats
        ? (trendMode === 'weekly' ? stats.weeklyTrend : stats.monthlyTrend)
        : []

    return (
        <View style={[s.root, { paddingTop: insets.top }]}> 
            <View style={s.header}>
                <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={17} color={C.mute} />
                    <Text style={s.backText}>Back</Text>
                </TouchableOpacity>
                <View style={s.headerCenter}>
                    <Text style={s.eyebrow}>Your progress</Text>
                    <Text style={s.headline}>Stats and activity</Text>
                </View>
                <TouchableOpacity style={s.refreshBtn} onPress={() => void refetch()} disabled={isRefetching}>
                    {isRefetching ? (
                        <ActivityIndicator size="small" color={C.bronze} />
                    ) : (
                        <Ionicons name="refresh" size={16} color={C.bronze} />
                    )}
                </TouchableOpacity>
            </View>

            <View style={s.divider} />

            {isLoading ? (
                <View style={s.loading}>
                    <ActivityIndicator size="large" color={C.bronze} />
                </View>
            ) : !stats ? (
                <View style={s.loading}>
                    <Ionicons name="alert-circle-outline" size={36} color={C.mute} />
                    <Text style={s.emptyText}>Could not load activity stats</Text>
                    <TouchableOpacity style={s.retryBtn} onPress={() => void refetch()}>
                        <Text style={s.retryBtnText}>Try again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <HeroSummary stats={stats} consistency={derived?.consistency ?? 0} />

                    <Text style={s.sectionLabel}>Cocktails made</Text>
                    <View style={s.periodGrid}>
                        <PeriodCard
                            icon="calendar-outline"
                            label="This week"
                            value={stats.thisWeek}
                            delta={stats.thisWeek - (derived?.previousWeek ?? 0)}
                            deltaLabel="vs previous week"
                        />
                        <PeriodCard
                            icon="today-outline"
                            label="This month"
                            value={stats.thisMonth}
                            delta={stats.thisMonth - (derived?.previousMonth ?? 0)}
                            deltaLabel="vs previous month"
                        />
                        <PeriodCard icon="leaf-outline" label="This year" value={stats.thisYear} />
                        <PeriodCard icon="trophy-outline" label="All time" value={stats.allTime} highlight />
                    </View>

                    <View style={s.insightRow}>
                        <InsightChip
                            icon="flame-outline"
                            label="Current streak"
                            value={`${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`}
                            active={stats.currentStreak > 0}
                        />
                        <InsightChip
                            icon="bar-chart-outline"
                            label="Avg weekly"
                            value={`${(derived?.avgWeekly ?? 0).toFixed(1)} drinks`}
                        />
                        <InsightChip
                            icon="sparkles-outline"
                            label="Best week"
                            value={derived?.bestWeeklyPoint ? `${derived.bestWeeklyPoint.drinks} (${derived.bestWeeklyPoint.label})` : 'No data'}
                        />
                    </View>

                    {(stats.weeklyTrend.length > 0 || stats.monthlyTrend.length > 0) && (
                        <>
                            <View style={s.sectionRow}>
                                <Text style={s.sectionLabel}>Activity trend</Text>
                                <View style={s.toggle}>
                                    <TouchableOpacity
                                        style={[s.toggleBtn, trendMode === 'weekly' && s.toggleBtnActive]}
                                        onPress={() => setTrendMode('weekly')}
                                    >
                                        <Text style={[s.toggleText, trendMode === 'weekly' && s.toggleTextActive]}>Weekly</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.toggleBtn, trendMode === 'monthly' && s.toggleBtnActive]}
                                        onPress={() => setTrendMode('monthly')}
                                    >
                                        <Text style={[s.toggleText, trendMode === 'monthly' && s.toggleTextActive]}>Monthly</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TrendChart data={trendData} mode={trendMode} />
                            <RecentActivityCard data={trendData} mode={trendMode} />
                        </>
                    )}

                    {stats.topCocktails.length > 0 && (
                        <>
                            <Text style={s.sectionLabel}>Most made cocktails</Text>
                            <View style={s.topCard}>
                                {stats.topCocktails.map((cocktail, index) => (
                                    <TopCocktailRow
                                        key={cocktail.cocktailId}
                                        rank={index + 1}
                                        cocktailId={cocktail.cocktailId}
                                        name={cocktail.name}
                                        imageUrl={cocktail.imageUrl}
                                        count={cocktail.count}
                                        archived={cocktail.archived}
                                        last={index === stats.topCocktails.length - 1}
                                    />
                                ))}
                            </View>
                        </>
                    )}

                    {stats.allTime === 0 && (
                        <View style={s.emptyWrap}>
                            <Ionicons name="wine-outline" size={40} color={C.border} />
                            <Text style={s.emptyTitle}>No drinks logged yet</Text>
                            <Text style={s.emptySub}>Make a cocktail and mark it as done to start tracking activity here.</Text>
                            <TouchableOpacity style={s.emptyCta} onPress={() => router.push('/(tabs)/cocktails')}>
                                <Text style={s.emptyCtaText}>Browse cocktails</Text>
                                <Ionicons name="arrow-forward" size={14} color="#f5ece0" />
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    )
}

function HeroSummary({ stats, consistency }: { stats: UserStats; consistency: number }) {
    const streakLabel = stats.currentStreak > 0
        ? `${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'} streak`
        : 'Start your first streak'

    return (
        <View style={hero.card}>
            <View style={hero.sheen} />
            <Text style={hero.eyebrow}>Activity snapshot</Text>
            <Text style={hero.value}>{stats.allTime}</Text>
            <Text style={hero.sub}>Cocktails logged all-time</Text>

            <View style={hero.row}>
                <View style={hero.pill}>
                    <Ionicons name="flame-outline" size={13} color="#f5ece0" />
                    <Text style={hero.pillText}>{streakLabel}</Text>
                </View>
                <View style={hero.pill}>
                    <Ionicons name="pulse-outline" size={13} color="#f5ece0" />
                    <Text style={hero.pillText}>{consistency}% consistency</Text>
                </View>
            </View>
        </View>
    )
}

function PeriodCard({
    icon,
    label,
    value,
    delta,
    deltaLabel,
    highlight = false,
}: {
    icon: IconName
    label: string
    value: number
    delta?: number
    deltaLabel?: string
    highlight?: boolean
}) {
    const hasDelta = typeof delta === 'number'
    const positive = (delta ?? 0) >= 0

    return (
        <View style={[pc.card, highlight && pc.cardHighlight]}>
            <View style={[pc.iconCircle, highlight && pc.iconCircleHighlight]}>
                <Ionicons name={icon} size={16} color={highlight ? '#f5ece0' : C.bronze} />
            </View>
            <Text style={[pc.value, highlight && pc.valueHighlight]}>{value}</Text>
            <Text style={[pc.label, highlight && pc.labelHighlight]}>{label}</Text>
            {hasDelta && deltaLabel ? (
                <View style={pc.deltaRow}>
                    <Ionicons name={positive ? 'trending-up' : 'trending-down'} size={11} color={positive ? '#5a7050' : '#a8472a'} />
                    <Text style={[pc.delta, !positive && pc.deltaNegative]}>
                        {positive ? '+' : ''}{delta} {deltaLabel}
                    </Text>
                </View>
            ) : null}
        </View>
    )
}

function InsightChip({ icon, label, value, active = false }: {
    icon: IconName
    label: string
    value: string
    active?: boolean
}) {
    return (
        <View style={[chip.card, active && chip.cardActive]}>
            <View style={[chip.iconCircle, active && chip.iconCircleActive]}>
                <Ionicons name={icon} size={15} color={active ? C.bronze : C.mute} />
            </View>
            <Text style={chip.value} numberOfLines={1}>{value}</Text>
            <Text style={chip.label} numberOfLines={1}>{label}</Text>
        </View>
    )
}

function TrendChart({ data, mode }: { data: TrendPoint[]; mode: TrendMode }) {
    const maxDrinks = Math.max(...data.map(point => point.drinks), 1)
    const barHeight = 96
    const barWidth = mode === 'weekly' ? 24 : 32

    return (
        <View style={ch.card}>
            <View style={ch.grid}>
                <View style={ch.gridLine} />
                <View style={ch.gridLine} />
                <View style={ch.gridLine} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ch.scroll}>
                {data.map((point, index) => {
                    const columnHeight = Math.max(4, (point.drinks / maxDrinks) * barHeight)
                    const isCurrent = index === data.length - 1
                    return (
                        <View key={`${point.label}-${index}`} style={ch.col}>
                            <View style={ch.barWrap}>
                                <View style={[ch.bar, { height: columnHeight, width: barWidth }, isCurrent && ch.barCurrent]} />
                            </View>
                            <Text style={[ch.count, point.drinks === 0 && ch.countMuted]}>{point.drinks}</Text>
                            <Text style={[ch.label, isCurrent && ch.labelCurrent]} numberOfLines={1}>{point.label}</Text>
                        </View>
                    )
                })}
            </ScrollView>
        </View>
    )
}

function RecentActivityCard({ data, mode }: { data: TrendPoint[]; mode: TrendMode }) {
    if (data.length === 0) return null

    const recent = [...data].slice(-4).reverse()
    const maxDrinks = Math.max(...recent.map(item => item.drinks), 1)

    return (
        <View style={ra.card}>
            <Text style={ra.title}>Recent {mode === 'weekly' ? 'weeks' : 'months'}</Text>
            {recent.map((item, index) => {
                const widthPct = `${Math.max(8, Math.round((item.drinks / maxDrinks) * 100))}%` as DimensionValue
                return (
                    <View key={`${item.label}-${index}`} style={[ra.row, index < recent.length - 1 && ra.rowBorder]}>
                        <Text style={ra.label}>{item.label}</Text>
                        <View style={ra.barTrack}>
                            <View style={[ra.barFill, { width: widthPct }]} />
                        </View>
                        <Text style={ra.value}>{item.drinks}</Text>
                    </View>
                )
            })}
        </View>
    )
}

function TopCocktailRow({ rank, cocktailId, name, imageUrl, count, archived, last }: {
    rank: number
    cocktailId: string
    name: string
    imageUrl: string | null
    count: number
    archived: boolean
    last: boolean
}) {
    const bg = toneForId(cocktailId)

    return (
        <TouchableOpacity
            style={[top.row, !last && top.rowBorder]}
            onPress={() => {
                if (!archived) router.push(`/cocktail/${cocktailId}`)
            }}
            activeOpacity={archived ? 1 : 0.7}
        >
            <Text style={top.rank}>#{rank}</Text>
            <View style={[top.thumb, { backgroundColor: bg }]}> 
                {imageUrl ? (
                    <Image
                        source={imageUrl}
                        style={StyleSheet.absoluteFillObject}
                        accessibilityRole="image"
                        accessibilityLabel={`${name} image`}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <Text style={top.initial}>{name.charAt(0).toUpperCase()}</Text>
                )}
            </View>
            <Text style={top.name} numberOfLines={1}>{name}</Text>
            {archived && <Text style={top.archived}>Archived</Text>}
            <View style={top.countWrap}>
                <Text style={top.count}>{count}</Text>
                <Text style={top.countLabel}>times</Text>
            </View>
            {!archived && <Ionicons name="chevron-forward" size={16} color={C.border} />}
        </TouchableOpacity>
    )
}

const s = StyleSheet.create({
    root:         { flex: 1, backgroundColor: C.cream },
    header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
    headerCenter: { flex: 1, alignItems: 'center' },
    backRow:      { width: 64, flexDirection: 'row', alignItems: 'center', gap: 4 },
    refreshBtn:   { width: 64, alignItems: 'flex-end', justifyContent: 'center' },
    backText:     { fontSize: 14, color: C.mute, fontWeight: '500' },
    eyebrow:      { fontSize: 8, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: C.bronze, marginBottom: 2 },
    headline:     { fontFamily: F.head, fontStyle: 'italic', fontSize: 20, fontWeight: '400', color: C.ink },
    divider:      { height: 1, backgroundColor: C.border },
    loading:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    retryBtn:     { marginTop: 4, borderWidth: 1, borderColor: C.borderWarm, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
    retryBtnText: { fontSize: 12, color: C.bronze, fontWeight: '600' },
    scroll:       { paddingHorizontal: 20, paddingTop: 16, gap: 0 },
    sectionLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.mute, marginBottom: 10, marginTop: 16 },
    sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 },
    periodGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    insightRow:   { gap: 8, marginBottom: 14 },
    topCard:      { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 24, overflow: 'hidden' },
    toggle:       { flexDirection: 'row', backgroundColor: C.card, borderRadius: 999, borderWidth: 1, borderColor: C.border, padding: 3, gap: 4 },
    toggleBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    toggleBtnActive: { backgroundColor: C.creamWarm },
    toggleText:   { fontSize: 11, color: C.mute, fontWeight: '600' },
    toggleTextActive: { color: C.bronze },
    emptyText:    { fontSize: 14, color: C.mute },
    emptyWrap:    { alignItems: 'center', gap: 10, paddingVertical: 32 },
    emptyTitle:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 20, color: C.ink },
    emptySub:     { fontSize: 13, color: C.mute, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
    emptyCta:     { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bronze, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
    emptyCtaText: { fontSize: 11, color: '#f5ece0', fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
})

const hero = StyleSheet.create({
    card:     { backgroundColor: C.heroDark, borderRadius: 22, padding: 18, marginBottom: 16, overflow: 'hidden' },
    sheen:    { position: 'absolute', top: -55, right: -35, width: 170, height: 170, borderRadius: 85, backgroundColor: C.bronzeLight, opacity: 0.35 },
    eyebrow:  { fontSize: 9, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(245,236,224,0.68)' },
    value:    { fontFamily: F.head, fontStyle: 'italic', fontSize: 48, color: '#f5ece0', lineHeight: 52, marginTop: 6 },
    sub:      { fontSize: 13, color: 'rgba(245,236,224,0.8)' },
    row:      { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
    pill:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(245,236,224,0.24)', backgroundColor: 'rgba(245,236,224,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    pillText: { fontSize: 11, color: '#f5ece0', fontWeight: '600' },
})

const pc = StyleSheet.create({
    card:               { flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14 },
    cardHighlight:      { backgroundColor: C.ink, borderColor: C.ink },
    iconCircle:         { width: 32, height: 32, borderRadius: 11, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    iconCircleHighlight:{ backgroundColor: 'rgba(245,236,224,0.18)' },
    value:              { fontFamily: F.head, fontStyle: 'italic', fontSize: 30, color: C.bronze, lineHeight: 33 },
    valueHighlight:     { color: '#f5ece0' },
    label:              { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: C.mute, marginTop: 3 },
    labelHighlight:     { color: 'rgba(245,236,224,0.72)' },
    deltaRow:           { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
    delta:              { fontSize: 10, color: '#5a7050', fontWeight: '600' },
    deltaNegative:      { color: '#a8472a' },
})

const chip = StyleSheet.create({
    card:             { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardActive:       { borderColor: C.bronzeLight, backgroundColor: C.creamWarm },
    iconCircle:       { width: 28, height: 28, borderRadius: 10, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    iconCircleActive: { backgroundColor: '#f5ece0' },
    value:            { flex: 1, fontSize: 13, color: C.ink, fontWeight: '600' },
    label:            { fontSize: 10, color: C.mute, textTransform: 'uppercase', letterSpacing: 0.9 },
})

const ch = StyleSheet.create({
    card:       { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, paddingVertical: 12, marginBottom: 10, overflow: 'hidden' },
    grid:       { position: 'absolute', left: 0, right: 0, top: 16, bottom: 24, justifyContent: 'space-between', paddingHorizontal: 14 },
    gridLine:   { borderTopWidth: 1, borderTopColor: C.border },
    scroll:     { paddingHorizontal: 14, gap: 8, alignItems: 'flex-end' },
    col:        { alignItems: 'center' },
    barWrap:    { height: 96, justifyContent: 'flex-end', marginBottom: 5 },
    bar:        { borderRadius: 8, backgroundColor: C.borderWarm },
    barCurrent: { backgroundColor: C.bronze },
    count:      { fontFamily: F.mono, fontSize: 9, color: C.bronze, marginBottom: 2 },
    countMuted: { color: C.mute },
    label:      { fontSize: 9, color: C.mute, textAlign: 'center', maxWidth: 44 },
    labelCurrent: { color: C.bronze, fontWeight: '700' },
})

const ra = StyleSheet.create({
    card:      { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12, paddingVertical: 6 },
    title:     { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: C.mute, paddingHorizontal: 14, paddingVertical: 8 },
    row:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 },
    rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    label:     { width: 56, fontSize: 11, color: C.mute },
    barTrack:  { flex: 1, height: 7, borderRadius: 999, backgroundColor: C.border },
    barFill:   { height: 7, borderRadius: 999, backgroundColor: C.bronzeLight },
    value:     { width: 28, textAlign: 'right', fontFamily: F.mono, fontSize: 12, color: C.ink },
})

const top = StyleSheet.create({
    row:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingHorizontal: 16 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    rank:      { fontFamily: F.mono, fontSize: 11, color: C.mute, width: 24 },
    thumb:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    initial:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 16, color: 'rgba(255,255,255,0.9)' },
    name:      { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink, marginRight: 2 },
    archived:  { fontSize: 9, color: C.mute, textTransform: 'uppercase', letterSpacing: 0.8 },
    countWrap: { alignItems: 'center' },
    count:     { fontFamily: F.mono, fontSize: 16, fontWeight: '700', color: C.bronze, lineHeight: 18 },
    countLabel:{ fontSize: 9, color: C.mute, letterSpacing: 0.5 },
})
