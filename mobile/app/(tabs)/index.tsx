import { type ComponentProps, useCallback, useMemo, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, type Href } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/auth/useAuth'
import { useProfile } from '@/features/profile/hooks'
import { useMakeableCocktails, useToggleFavorite, useFavoriteIds } from '@/features/cocktails/hooks'
import { usePlannedCocktails } from '@/features/planner/hooks'
import { Skeleton } from '@/components/ui/Skeleton'
import { showGlobalNoticeDialog } from '@/components/ui/ActionDialog'
import { SmartCollectionsRow } from '@/components/planner/SmartCollectionsRow'
import { CreateCollectionSheet, type CreateCollectionInitialValues } from '@/components/planner/CreateCollectionSheet'
import { useFloatingTabBarLayout } from '@/components/navigation/FloatingTabBarLayoutContext'
import { C, F, toneForId } from '@/theme/brand'
import { isMakeableCocktailNow, type MakeableCocktail } from '@mixoguide/shared'

type IconName = ComponentProps<typeof Ionicons>['name']
const INSTAGRAM_URL = 'https://www.instagram.com/mixoguide/'

function dayTimeLabel() {
    const d = new Date()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const h = d.getHours()
    const min = String(d.getMinutes()).padStart(2, '0')
    const ampm = h >= 12 ? 'pm' : 'am'
    const h12 = h % 12 || 12
    return `${days[d.getDay()]} · ${h12}:${min} ${ampm}`
}

function greeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning,'
    if (h < 18) return 'Good afternoon,'
    return 'Good evening,'
}

function heroMakeableLabel(_cocktail: MakeableCocktail): string {
    return 'Makeable'
}

const QUICK_ACTIONS: { icon: IconName; label: string; sub: string; href: Href }[] = [
    { icon: 'flash-outline',             label: 'Browse cocktails',         sub: 'Find drinks you can make tonight', href: { pathname: '/(tabs)/cocktails', params: { makeable: '1' } } },
    { icon: 'calendar-outline',          label: 'Plan a gathering',         sub: 'Manage your collections',   href: '/(tabs)/planner' },
    { icon: 'file-tray-stacked-outline', label: 'Restock pantry',           sub: 'Update your ingredients',   href: '/(tabs)/pantry' },
]

export default function HomeScreen() {
    const insets = useSafeAreaInsets()
    const { getScrollPadding } = useFloatingTabBarLayout(insets.bottom)
    const tabScrollPadding = getScrollPadding()
    const { user } = useAuth()
    const { data: profile, isLoading: profileLoading } = useProfile()
    const { data: makeable = [] }  = useMakeableCocktails()
    const { data: planned  = [] }  = usePlannedCocktails()
    const { data: favoriteIds = [] } = useFavoriteIds()
    const toggleFav = useToggleFavorite()

    const [showCreateSheet, setShowCreateSheet]         = useState(false)
    const [createInitialValues, setCreateInitialValues] = useState<CreateCollectionInitialValues | undefined>()
    const openTheme = useCallback((initial: CreateCollectionInitialValues) => {
        setCreateInitialValues(initial)
        setShowCreateSheet(true)
    }, [])
    const closeCreateSheet = useCallback(() => {
        setShowCreateSheet(false)
        setCreateInitialValues(undefined)
    }, [])

    const firstName    = (profile?.name ?? user?.name ?? '').split(' ')[0] || 'there'

    // Ingredients that, if added, unlock the most cocktails right now
    const unlockData = useMemo(() => {
        const scores = new Map<string, { name: string; count: number, id: string }>()
        for (const c of makeable) {
            if (c.missingCount !== 1) continue
            for (const ing of c.missingIngredients) {
                const e = scores.get(ing.id)
                if (e) e.count++
                else scores.set(ing.id, { name: ing.name, count: 1, id: ing.id })
            }
        }
        return [...scores.values()].sort((a, b) => b.count - a.count).slice(0, 3)
    }, [makeable])
    const pantryCount  = profile?.stats.pantryItems ?? 0
    const plannedCount = planned.filter(p => p.status === 'planned').length

    const readyList = useMemo(() => {
        return makeable.filter(isMakeableCocktailNow)
    }, [makeable])

    const readyCount = readyList.length

    const hero = useMemo(() => {
        const source = readyList.length > 0 ? readyList : makeable

        if (source.length === 0) return undefined

        return source[Math.floor(Math.random() * source.length)]
    }, [readyList, makeable])
    const heroIngredients = hero?.ingredients?.slice(0, 3).map(i => i.ingredient.name).join(' · ') ?? ''

    const isHeroFav    = hero ? favoriteIds.includes(hero.id) : false

    function handleInstagramPress() {
        Linking.openURL(INSTAGRAM_URL).catch(() => {
            showGlobalNoticeDialog({ title: 'Instagram', message: 'Could not open Instagram right now.', icon: 'logo-instagram' })
        })
    }

    const handleBrowseCocktails = useCallback((href: Href = '/(tabs)/cocktails') => {
        router.push(href)
    }, [])

    return (
        <>
        <ScrollView
            style={s.root}
            contentContainerStyle={[s.content, { paddingTop: insets.top + 14, paddingBottom: tabScrollPadding }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={s.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={s.eyebrow}>{dayTimeLabel()}</Text>
                    <View style={{ height: 6 }} />
                    {profileLoading ? (
                        <>
                            <Skeleton height={13} width={90} borderRadius={4} />
                            <Skeleton height={28} width={200} borderRadius={6} style={{ marginTop: 6 }} />
                        </>
                    ) : (
                        <Text style={s.headline}>{greeting()}{'\n'}{firstName}</Text>
                    )}
                </View>
                <TouchableOpacity style={s.avatar} onPress={() => router.push('/(tabs)/profile')}>
                    {user?.image ? (
                        <Image
                            source={{ uri: user.image }}
                            style={s.avatarImage}
                            accessibilityRole="image"
                            accessibilityLabel={`${profile?.name ?? user.name ?? 'User'} profile image`}
                            contentFit="cover"
                        />
                    ) : (
                        <Text style={s.avatarText}>
                            {(profile?.name ?? user?.name ?? '?').charAt(0).toUpperCase()}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Hero card — Tonight's pour */}
            {hero ? (
                <TouchableOpacity
                    style={s.hero}
                    onPress={() => router.push(`/cocktail/${hero.id}`)}
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${hero.name}`}
                >
                    {/* Simulated radial highlight top-right */}
                    <View style={s.heroSheen} />
                    <View style={s.heroPad}>
                        <Text style={s.heroEyebrow}>Tonight's pour</Text>
                        <View style={{ height: 10 }} />
                        <Text style={s.heroName}>{hero.name}</Text>
                        {heroIngredients ? (
                            <>
                                <View style={{ height: 6 }} />
                                <Text style={s.heroSub}>{heroIngredients}</Text>
                            </>
                        ) : null}
                        <View style={s.heroMeta}>
                            <View style={s.heroPill}>
                                <Text style={s.heroPillText}>{heroMakeableLabel(hero)}</Text>
                            </View>
                            {(hero.avgRating || hero.preparationTime) ? (
                                <View style={s.heroStatsRow}>
                                    {hero.avgRating ? (
                                        <View style={s.inlineStat}>
                                            <Ionicons name="star" size={12} color="rgba(255,255,255,0.55)" />
                                            <Text style={s.heroStats}>{hero.avgRating.toFixed(1)}</Text>
                                        </View>
                                    ) : null}
                                    {hero.preparationTime ? (
                                        <View style={s.inlineStat}>
                                            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.55)" />
                                            <Text style={s.heroStats}>{hero.preparationTime} min</Text>
                                        </View>
                                    ) : null}
                                </View>
                            ) : null}
                        </View>
                        <View style={s.heroButtons}>
                            <TouchableOpacity
                                style={s.heroCta}
                                onPress={() => router.push(`/cocktail/${hero.id}`)}
                            >
                                <Text style={s.heroCtaText}>Make this</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.heroHeart}
                                onPress={() => toggleFav.mutate({ cocktailId: hero.id, isFav: isHeroFav })}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel={isHeroFav ? `Remove ${hero.name} from favorites` : `Add ${hero.name} to favorites`}
                                accessibilityState={{ selected: isHeroFav }}
                            >
                                <Ionicons name={isHeroFav ? 'heart' : 'heart-outline'} size={22} color="#f5ece0" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            ) : null}

            {/* Stats strip */}
            <View style={s.statsRow}>
                {([
                    { v: readyCount,   l: 'Makeable' },
                    { v: pantryCount,  l: 'Pantry items' },
                    { v: plannedCount, l: 'Planned' },
                ] as { v: number; l: string }[]).map((st, i) => (
                    <View key={i} style={s.statCard}>
                        <Text style={s.statValue}>{st.v}</Text>
                        <View style={{ height: 4 }} />
                        <Text style={s.statLabel}>{st.l}</Text>
                    </View>
                ))}
            </View>

            {/* Browse CTA */}
            {readyList.length == 0 && (
                <TouchableOpacity
                    style={s.browseCta}
                    onPress={() => handleBrowseCocktails(readyCount > 0 ? { pathname: '/(tabs)/cocktails', params: { makeable: '1' } } : '/(tabs)/cocktails')}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel="Browse cocktails"
                >
                    <View style={s.browseCtaIcon}>
                        <Ionicons name="wine-outline" size={18} color={C.bronze} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.browseCtaTitle}>Browse cocktails</Text>
                        <Text style={s.browseCtaSub}>{readyCount > 0 ? `${readyCount} ready to mix now` : 'Open the full cocktail library'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={19} color={C.mute} />
                </TouchableOpacity>
            )}

            {/* Makeable now — horizontal scroll */}
            {readyList.length > 0 && (
                <>
                    <View style={s.sectionRow}>
                        <Text style={s.sectionHead}>Makeable now</Text>
                        <TouchableOpacity style={s.sectionLink} onPress={() => handleBrowseCocktails('/(tabs)/cocktails')}>
                            <Text style={s.sectionLinkText}>See all</Text>
                            <Ionicons name="arrow-forward" size={13} color={C.mute} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.hScroll}
                    >
                        {readyList.slice(0, 8).map(c => (
                            <MakeableCard key={c.id} cocktail={c} />
                        ))}
                        <View style={{ width: 8 }} />
                    </ScrollView>
                </>
            )}

            {/* Unlock more drinks */}
            {unlockData.length > 0 && (
                <>
                    <View style={[s.sectionRow, { marginTop: 22 }]}>
                        <Text style={s.sectionHead}>Unlock more drinks</Text>

                        <TouchableOpacity
                            style={s.sectionLink}
                            onPress={() => router.push('/(tabs)/pantry')}
                        >
                            <Text style={s.sectionLinkText}>Pantry</Text>
                            <Ionicons name="arrow-forward" size={13} color={C.mute} />
                        </TouchableOpacity>
                    </View>

                    <View style={s.unlockCard}>
                        {unlockData.map((ing, i) => (
                            <View key={ing.id}>
                                {i > 0 && <View style={s.unlockDivider} />}

                                <TouchableOpacity
                                    style={s.unlockRow}
                                    onPress={() =>
                                        router.push(`/ingredient/${ing.id}`)
                                    }
                                    activeOpacity={0.7}
                                >
                                    <View style={s.unlockDot} />

                                    <Text style={s.unlockName} numberOfLines={1}>
                                        {ing.name}
                                    </Text>

                                    <View style={s.unlockBadge}>
                                        <Text style={s.unlockBadgeText}>
                                            +{ing.count} {ing.count === 1 ? 'drink' : 'drinks'}
                                        </Text>
                                    </View>

                                    <Ionicons
                                        name="add-circle-outline"
                                        size={20}
                                        color={C.bronze}
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </>
            )}

            <TouchableOpacity
                style={s.instagramCard}
                onPress={handleInstagramPress}
                activeOpacity={0.85}
                accessibilityRole="link"
                accessibilityLabel="Follow MixoGuide on Instagram"
            >
                <View style={s.instagramIcon}>
                    <Ionicons name="logo-instagram" size={18} color={C.bronze} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.instagramTitle}>Follow the pour</Text>
                    <Text style={s.instagramSub}>Recipes and bar notes on @mixoguide</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={C.mute} />
            </TouchableOpacity>

            {/* Smart collections — curated themes with cocktails ready to plan */}
            <View style={s.smartWrap}>
                <SmartCollectionsRow title="Vibes for you" onOpenTheme={openTheme} />
            </View>

            {/* Quick actions */}
            <Text style={[s.eyebrow, { marginTop: 20, marginBottom: 12 }]}>Quick actions</Text>
            <View style={s.quickList}>
                {QUICK_ACTIONS.map((r, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[s.quickRow, i < QUICK_ACTIONS.length - 1 && s.quickRowBorder]}
                        onPress={() => i === 0 ? handleBrowseCocktails(r.href) : router.push(r.href)}
                        activeOpacity={0.7}
                    >
                        <View style={s.quickIcon}>
                            <Ionicons name={r.icon} size={20} color={C.bronze} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.quickLabel}>{r.label}</Text>
                            <Text style={s.quickSub}>{r.sub}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={C.mute} />
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>

        <CreateCollectionSheet
            visible={showCreateSheet}
            onClose={closeCreateSheet}
            initialValues={createInitialValues}
        />
        </>
    )
}

function MakeableCard({ cocktail }: { cocktail: MakeableCocktail }) {
    const bg = toneForId(cocktail.id)
    return (
        <TouchableOpacity
            style={s.makeCard}
            onPress={() => router.push(`/cocktail/${cocktail.id}`)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Open ${cocktail.name}`}
        >
            <View style={[s.makeCardImg, { backgroundColor: bg }]}>
                {cocktail.imageUrl ? (
                    <Image
                        source={cocktail.imageUrl}
                        style={s.makeCardImgPhoto}
                        accessibilityRole="image"
                        accessibilityLabel={`${cocktail.name} image`}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                    />
                ) : (
                    <View style={s.makeCardSheen} />
                )}
            </View>
            <View style={s.makeCardBody}>
                <Text style={s.makeCardName} numberOfLines={1}>{cocktail.name}</Text>
                <View style={{ height: 4 }} />
                <View style={s.makeCardMetaRow}>
                    {cocktail.avgRating ? (
                        <View style={s.makeCardMetaItem}>
                            <Ionicons name="star" size={10} color={C.mute} />
                            <Text style={s.makeCardMeta}>{cocktail.avgRating.toFixed(1)}</Text>
                        </View>
                    ) : null}
                    {cocktail.preparationTime ? (
                        <View style={s.makeCardMetaItem}>
                            <Ionicons name="time-outline" size={10} color={C.mute} />
                            <Text style={s.makeCardMeta}>{cocktail.preparationTime} min</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    )
}

const s = StyleSheet.create({
    root:    { flex: 1, backgroundColor: C.cream },
    content: { paddingHorizontal: 20 },
    smartWrap: { marginHorizontal: -20 },

    instagramCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 18, marginBottom: 6 },
    instagramIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    instagramTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
    instagramSub: { fontSize: 11, color: C.mute, marginTop: 2 },

    // Header
    headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    eyebrow:     { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    headline:    { fontFamily: F.head, fontStyle: 'italic', fontSize: 26, fontWeight: '400', color: C.ink, lineHeight: 30 },
    avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center', shadowColor: C.bronze, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    avatarText:  { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, color: '#fff' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 42 },

    // Hero card
    hero:         { borderRadius: 24, overflow: 'hidden', backgroundColor: C.heroDark, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    heroSheen:    { position: 'absolute', top: -40, right: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: C.bronzeLight, opacity: 0.4 },
    heroPad:      { padding: 22, paddingBottom: 20 },
    heroEyebrow:  { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' },
    heroName:     { fontFamily: F.head, fontStyle: 'italic', fontSize: 34, fontWeight: '400', color: '#f5ece0', lineHeight: 38 },
    heroSub:      { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    heroMeta:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 },
    heroPill:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(245,236,224,0.15)', borderWidth: 1, borderColor: 'rgba(245,236,224,0.25)' },
    heroPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#f5ece0' },
    heroStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    inlineStat:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
    heroStats:    { fontFamily: F.mono, fontSize: 11, color: 'rgba(255,255,255,0.55)' },
    heroButtons:  { marginTop: 18, flexDirection: 'row', gap: 10 },
    heroCta:      { flex: 1, padding: 12, borderRadius: 14, backgroundColor: '#fbf9f6', alignItems: 'center' },
    heroCtaText:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: C.bronze },
    heroHeart:    { width: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(245,236,224,0.3)', alignItems: 'center', justifyContent: 'center' },

    // Stats strip
    statsRow:  { flexDirection: 'row', gap: 10, marginBottom: 22 },
    statCard:  { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
    statValue: { fontFamily: F.head, fontStyle: 'italic', fontSize: 26, color: C.bronze, lineHeight: 28 },
    statLabel: { fontSize: 9, fontWeight: '500', letterSpacing: 1.7, textTransform: 'uppercase', color: C.mute },

    browseCta: { minHeight: 58, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: -8, marginBottom: 22 },
    browseCtaIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    browseCtaTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
    browseCtaSub: { fontSize: 11, color: C.mute, marginTop: 2 },

    // Makeable now
    sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
    sectionHead:  { fontFamily: F.head, fontStyle: 'italic', fontSize: 20, fontWeight: '400', color: C.ink },
    sectionLink:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
    sectionLinkText: { fontSize: 11, color: C.mute },
    hScroll:      { paddingRight: 20, gap: 12 },
    makeCard:     { width: 142, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    makeCardImg:  { height: 120, position: 'relative' },
    makeCardImgPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    makeCardSheen:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.2)' },
    makeCardBody: { padding: 10, paddingBottom: 12 },
    makeCardName: { fontFamily: F.head, fontStyle: 'italic', fontSize: 17, fontWeight: '400', color: C.ink },
    makeCardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    makeCardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    makeCardMeta: { fontFamily: F.mono, fontSize: 10, color: C.mute },

    // Unlock more drinks
    unlockCard:      { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 4 },
    unlockRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
    unlockDivider:   { height: 1, backgroundColor: C.border },
    unlockDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: C.bronze, flexShrink: 0 },
    unlockName:      { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink },
    unlockBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: C.creamWarm },
    unlockBadgeText: { fontFamily: F.mono, fontSize: 10, fontWeight: '700', color: C.bronze, letterSpacing: 0.4 },

    // Quick actions
    quickList:      { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 8 },
    quickRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingHorizontal: 16 },
    quickRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    quickIcon:      { width: 38, height: 38, borderRadius: 12, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    quickLabel:     { fontSize: 14, fontWeight: '600', color: C.ink },
    quickSub:       { fontSize: 11, color: C.mute },
})
