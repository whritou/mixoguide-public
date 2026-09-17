import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, type DimensionValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { markOnboardingComplete } from '@/auth/tokenStore'
import { C, F } from '@/theme/brand'

type IconName = ComponentProps<typeof Ionicons>['name']

interface StepConfig {
    eyebrow: string
    title: string
    body: string
    icon: IconName
    preview: ReactNode
}

function MiniCocktailLibrary() {
    return (
        <View style={preview.phone}>
            <View style={preview.headerRow}>
                <Text style={preview.eyebrow}>The library</Text>
                <View style={preview.searchDot} />
            </View>
            <Text style={preview.screenTitle}>Cocktails</Text>
            <View style={preview.searchBar}>
                <Ionicons name="search-outline" size={12} color={C.mute} />
                <Text style={preview.searchText}>makeable tonight</Text>
            </View>
            <View style={preview.grid}>
                {[
                    { name: 'Daiquiri', ready: true, meta: '3/3 pantry' },
                    { name: 'Negroni', ready: true, meta: '3/3 pantry' },
                    { name: 'Mai Tai', ready: false, meta: '4/6 pantry' },
                    { name: 'Paloma', ready: false, meta: '2/4 pantry' },
                ].map(item => (
                    <View key={item.name} style={preview.cocktailCard}>
                        <View style={[preview.drinkTile, item.ready && preview.drinkTileReady]}>
                            {item.ready ? (
                                <View style={preview.readyBadge}>
                                    <Ionicons name="checkmark-circle" size={9} color={C.bronze} />
                                    <Text style={preview.readyText}>Ready</Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={preview.cardTitle} numberOfLines={1}>{item.name}</Text>
                        <Text style={preview.cardMeta}>{item.meta}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}

function MiniPantry() {
    return (
        <View style={preview.phone}>
            <View style={preview.bronzePanel}>
                <Text style={preview.bronzeEyebrow}>Your stock</Text>
                <Text style={preview.bronzeTitle}>My pantry</Text>
                <View style={preview.statRow}>
                    <Stat value="18" label="Items" />
                    <Stat value="2" label="Low" />
                    <Stat value="12" label="Makeable" />
                </View>
            </View>
            {([
                { name: 'Gin', amount: '62 cl', width: 78 },
                { name: 'Lime juice', amount: '14 cl', width: 32 },
                { name: 'Simple syrup', amount: 'Low', width: 16 },
            ] as { name: string; amount: string; width: number }[]).map(item => (
                <View key={item.name} style={preview.stockRow}>
                    <View style={preview.stockTop}>
                        <Text style={preview.stockName}>{item.name}</Text>
                        <Text style={preview.stockAmount}>{item.amount}</Text>
                    </View>
                    <View style={preview.stockTrack}>
                        <View style={[preview.stockFill, { width: `${item.width}%` as DimensionValue }]} />
                    </View>
                </View>
            ))}
        </View>
    )
}

function MiniPlanner() {
    return (
        <View style={preview.phone}>
            <Text style={preview.eyebrow}>The agenda</Text>
            <Text style={preview.screenTitle}>Planner</Text>
            <View style={preview.eventCard}>
                <View style={preview.eventStrips}>
                    <View style={[preview.eventStrip, { backgroundColor: '#e8c590' }]} />
                    <View style={[preview.eventStrip, { backgroundColor: '#cad9b3' }]} />
                    <View style={[preview.eventStrip, { backgroundColor: '#e9b8a4' }]} />
                </View>
                <Text style={preview.eventDate}>Tonight, 7:00 PM</Text>
                <Text style={preview.eventTitle}>Aperitivo night</Text>
                <Text style={preview.eventMeta}>3 cocktails - 8 servings</Text>
                <View style={preview.eventTrack}>
                    <View style={preview.eventFill} />
                </View>
            </View>
            <View style={preview.agendaRow}>
                <View style={preview.calendarIcon}>
                    <Text style={preview.calendarTop}>MAY</Text>
                    <Text style={preview.calendarDay}>23</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={preview.stockName}>Negroni</Text>
                    <Text style={preview.cardMeta}>Ready to mix</Text>
                </View>
                <Ionicons name="checkmark-circle-outline" size={19} color={C.bronze} />
            </View>
        </View>
    )
}

function MiniAccount() {
    return (
        <View style={preview.phone}>
            <View style={preview.finishBadge}>
                <Ionicons name="wine" size={34} color={C.bronze} />
            </View>
            <Text style={preview.finishTitle}>Make your home bar easier to use.</Text>
            <View style={preview.finishList}>
                {['Save favorites', 'Sync pantry', 'Plan drinks', 'Track what you make'].map(item => (
                    <View key={item} style={preview.finishItem}>
                        <Ionicons name="checkmark" size={13} color={C.bronze} />
                        <Text style={preview.finishItemText}>{item}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <View>
            <Text style={preview.statValue}>{value}</Text>
            <Text style={preview.statLabel}>{label}</Text>
        </View>
    )
}

export default function OnboardScreen() {
    const insets = useSafeAreaInsets()
    const [index, setIndex] = useState(0)

    const steps = useMemo<StepConfig[]>(() => [
        {
            eyebrow: 'Cocktails',
            title: 'Cocktails that know your bar',
            body: 'Browse recipes with makeable badges, pantry coverage, favorites, and quick filters for what you can mix tonight.',
            icon: 'wine-outline',
            preview: <MiniCocktailLibrary />,
        },
        {
            eyebrow: 'Pantry',
            title: 'Pantry without guesswork',
            body: 'Track bottles, mixers, garnish, low stock, and shopping items so readiness updates as your shelf changes.',
            icon: 'file-tray-stacked-outline',
            preview: <MiniPantry />,
        },
        {
            eyebrow: 'Planner',
            title: 'Plan drinks and events',
            body: 'Schedule a single drink or a full event, see what is missing, then turn the list into your next stocked bar.',
            icon: 'calendar-outline',
            preview: <MiniPlanner />,
        },
        {
            eyebrow: 'Start',
            title: 'Build your cocktail rhythm',
            body: 'Create an account to keep your favorites, pantry, planner, and made history together.',
            icon: 'sparkles-outline',
            preview: <MiniAccount />,
        },
    ], [])

    const step = steps[index]
    const isLast = index === steps.length - 1

    const handleNavigate = (path: string) => async () => {
        await markOnboardingComplete()
        router.push(path)
    }

    return (
        <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={s.topRow}>
                    <View style={s.logoRow}>
                        <View style={s.logoCircle}>
                            <Ionicons name={step.icon} size={18} color={C.bronze} />
                        </View>
                        <Text style={s.appName}>MixoGuide</Text>
                    </View>
                    <Text style={s.progressText}>{index + 1}/{steps.length}</Text>
                </View>

                <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${((index + 1) / steps.length) * 100}%` }]} />
                </View>

                <View style={s.previewWrap}>
                    {step.preview}
                </View>

                <View style={s.copy}>
                    <Text style={s.eyebrow}>{step.eyebrow}</Text>
                    <Text style={s.title}>{step.title}</Text>
                    <Text style={s.body}>{step.body}</Text>
                </View>
            </ScrollView>

            <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
                {isLast ? (
                    <>
                        <TouchableOpacity
                            style={s.primaryBtn}
                            onPress={handleNavigate('/(auth)/register')}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                        >
                            <Text style={s.primaryBtnText}>Create account</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={s.secondaryBtn}
                            onPress={handleNavigate('/(auth)/sign-in')}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                        >
                            <Text style={s.secondaryBtnText}>Sign in</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        style={s.primaryBtn}
                        onPress={() => setIndex(value => Math.min(steps.length - 1, value + 1))}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                    >
                        <Text style={s.primaryBtnText}>Next</Text>
                        <Ionicons name="arrow-forward" size={15} color="#f5ece0" />
                    </TouchableOpacity>
                )}

                {index > 0 ? (
                    <TouchableOpacity
                        style={s.previousBtn}
                        onPress={() => setIndex(value => Math.max(0, value - 1))}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                    >
                        <Ionicons name="arrow-back" size={14} color={C.bronze} />
                        <Text style={s.previousText}>Previous</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    )
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.cream },
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoCircle: { width: 34, height: 34, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    appName: { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, color: C.ink },
    progressText: { fontFamily: F.mono, fontSize: 11, color: C.mute, fontWeight: '700' },
    progressTrack: { height: 4, borderRadius: 999, backgroundColor: C.border, overflow: 'hidden', marginTop: 16 },
    progressFill: { height: 4, borderRadius: 999, backgroundColor: C.bronze },
    previewWrap: { flex: 1, minHeight: 390, alignItems: 'center', justifyContent: 'center', paddingVertical: 22 },
    copy: { gap: 9 },
    eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    title: { fontFamily: F.head, fontStyle: 'italic', fontSize: 31, lineHeight: 35, color: C.ink },
    body: { fontSize: 14, lineHeight: 21, color: C.mute },
    footer: { paddingHorizontal: 20, paddingTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: 'rgba(251,249,246,0.96)' },
    primaryBtn: { minHeight: 50, borderRadius: 16, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
    primaryBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase', color: '#f5ece0' },
    secondaryBtn: { minHeight: 50, borderRadius: 16, borderWidth: 1.5, borderColor: C.bronze, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
    secondaryBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase', color: C.bronze },
    previousBtn: { minHeight: 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 12 },
    previousText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', color: C.bronze },
})

const preview = StyleSheet.create({
    phone: { width: '100%', maxWidth: 330, borderRadius: 28, borderWidth: 1, borderColor: C.borderWarm, backgroundColor: C.card, padding: 14, shadowColor: C.ink, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    eyebrow: { fontSize: 8, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: C.bronze },
    screenTitle: { fontFamily: F.head, fontStyle: 'italic', fontSize: 24, color: C.ink, marginTop: 4 },
    searchDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.creamWarm },
    searchBar: { minHeight: 34, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.cream, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, marginTop: 12 },
    searchText: { fontSize: 11, color: C.mute },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    cocktailCard: { width: '48%', borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, overflow: 'hidden' },
    drinkTile: { height: 80, backgroundColor: '#e9b8a4', padding: 8 },
    drinkTileReady: { backgroundColor: '#cad9b3' },
    readyBadge: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: 'rgba(251,249,246,0.92)', paddingHorizontal: 7, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 3 },
    readyText: { fontSize: 8, fontWeight: '800', color: C.bronze, textTransform: 'uppercase' },
    cardTitle: { fontFamily: F.head, fontStyle: 'italic', fontSize: 15, color: C.ink, paddingHorizontal: 9, paddingTop: 8 },
    cardMeta: { fontFamily: F.mono, fontSize: 9, color: C.mute, paddingHorizontal: 9, paddingBottom: 10, marginTop: 2 },
    bronzePanel: { borderRadius: 18, backgroundColor: C.bronze, padding: 14, overflow: 'hidden' },
    bronzeEyebrow: { fontSize: 8, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(245,236,224,0.75)' },
    bronzeTitle: { fontFamily: F.head, fontStyle: 'italic', fontSize: 25, color: '#f5ece0', marginTop: 2 },
    statRow: { flexDirection: 'row', gap: 28, marginTop: 12 },
    statValue: { fontFamily: F.head, fontStyle: 'italic', fontSize: 20, color: '#fff' },
    statLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(245,236,224,0.72)' },
    stockRow: { borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, marginTop: 10 },
    stockTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    stockName: { fontSize: 13, fontWeight: '700', color: C.ink },
    stockAmount: { fontFamily: F.mono, fontSize: 11, color: C.bronze },
    stockTrack: { height: 5, borderRadius: 999, backgroundColor: C.border, overflow: 'hidden', marginTop: 8 },
    stockFill: { height: 5, borderRadius: 999, backgroundColor: C.bronze },
    eventCard: { borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.cream, overflow: 'hidden', marginTop: 12 },
    eventStrips: { flexDirection: 'row', height: 6 },
    eventStrip: { flex: 1 },
    eventDate: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: C.bronze, paddingHorizontal: 14, paddingTop: 14 },
    eventTitle: { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, color: C.ink, paddingHorizontal: 14, marginTop: 4 },
    eventMeta: { fontFamily: F.mono, fontSize: 10, color: C.mute, paddingHorizontal: 14, marginTop: 4 },
    eventTrack: { height: 4, borderRadius: 999, backgroundColor: C.border, overflow: 'hidden', margin: 14 },
    eventFill: { height: 4, width: '68%', borderRadius: 999, backgroundColor: C.bronze },
    agendaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 12, marginTop: 10 },
    calendarIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    calendarTop: { fontSize: 7, fontWeight: '800', color: C.mute },
    calendarDay: { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, color: C.bronze, lineHeight: 20 },
    finishBadge: { width: 76, height: 76, borderRadius: 26, backgroundColor: C.creamWarm, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    finishTitle: { fontFamily: F.head, fontStyle: 'italic', fontSize: 24, lineHeight: 29, color: C.ink, textAlign: 'center', marginTop: 18 },
    finishList: { gap: 9, marginTop: 18, marginBottom: 8 },
    finishItem: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, backgroundColor: C.cream, paddingHorizontal: 12, paddingVertical: 10 },
    finishItemText: { fontSize: 13, fontWeight: '600', color: C.ink },
})
