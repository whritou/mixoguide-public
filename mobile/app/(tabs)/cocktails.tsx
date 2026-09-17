import { useState, useCallback, useEffect, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useInfiniteCocktails, useFavoriteIds, useToggleFavorite, useMakeableCocktails, useDerivations } from '@/features/cocktails/hooks'
import { usePantryItems } from '@/features/pantry/hooks'
import { FilterSheet, FilterState, DEFAULT_FILTERS } from '@/components/cocktail/FilterSheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { useProductTour } from '@/onboarding/ProductTour'
import { useFloatingTabBarLayout } from '@/components/navigation/FloatingTabBarLayoutContext'
import { C, F, toneForId } from '@/theme/brand'
import type { DerivationMap } from '@/api/endpoints/derivations'
import {
    isBlockingCocktailIngredient,
    isMakeableCocktailNow,
    type CocktailDTO,
    type MakeableCocktail,
    type CocktailIngredient,
    type UserPantryItemDTO,
} from '@mixoguide/shared'

const SKELETONS = Array.from({ length: 6 }, (_, i) => `sk-${i}`)
const TABLET_GRID_MIN_WIDTH = 700
type PantryProgress = { pantryCount: number; requiredCount: number }

function findDerivedFromId(ingredientId: string, pantryIngredientIds: Set<string>, derivations: DerivationMap): string | null {
    for (const entry of derivations[ingredientId] ?? []) {
        if (pantryIngredientIds.has(entry.baseIngredientId)) return entry.baseIngredientId
    }
    return null
}

function isSatisfiedCocktailIngredient(
    ing: CocktailIngredient,
    pantryMap: Record<string, UserPantryItemDTO>,
    pantryIngredientIds: Set<string>,
    derivations: DerivationMap,
): boolean {
    if (pantryMap[ing.ingredientId]?.isInPantry) return true
    if (findDerivedFromId(ing.ingredientId, pantryIngredientIds, derivations)) return true

    for (const substituteId of ing.substitutes ?? []) {
        if (pantryMap[substituteId]?.isInPantry) return true
        if (findDerivedFromId(substituteId, pantryIngredientIds, derivations)) return true
    }

    return false
}

function computePantryProgress(
    ingredients: CocktailIngredient[] | undefined,
    pantryMap: Record<string, UserPantryItemDTO>,
    pantryIngredientIds: Set<string>,
    derivations: DerivationMap,
): PantryProgress | null {
    const required = (ingredients ?? []).filter(isBlockingCocktailIngredient)
    const requiredCount = required.length
    if (requiredCount <= 0) return null

    const pantryCount = required.reduce((count, ing) =>
        count + (isSatisfiedCocktailIngredient(ing, pantryMap, pantryIngredientIds, derivations) ? 1 : 0),
    0)

    return { pantryCount, requiredCount }
}

function sortSummary(filters: FilterState): string {
    if (!filters.sortBy || filters.sortBy === 'avgRating') return 'highest rated'
    if (filters.sortBy === 'ratingCount') return 'most popular'
    if (filters.sortBy === 'preparationTime') return 'quickest'
    if (filters.sortBy === 'createdAt') return 'newest'
    if (filters.sortBy === 'name') return filters.sortOrder === 'desc' ? 'Z-A' : 'A-Z'
    return 'custom'
}

type RouteParam = string | string[] | undefined

function firstParam(value: RouteParam): string | undefined {
    return Array.isArray(value) ? value[0] : value
}

function csvParam(value: RouteParam): string[] {
    return (firstParam(value) ?? '').split(',').filter(Boolean)
}

function boolParam(value: RouteParam): boolean | null {
    const v = firstParam(value)
    if (v === 'true') return true
    if (v === 'false') return false
    return null
}

function filtersFromParams(params: Record<string, RouteParam>): FilterState {
    const sortOrder = firstParam(params.sortOrder)
    return {
        ...DEFAULT_FILTERS,
        difficulty:    firstParam(params.difficulty) ?? null,
        isAlcoholic:   boolParam(params.alcoholic),
        flavors:       csvParam(params.flavors),
        occasions:     csvParam(params.occasions),
        onlyMakeable:  firstParam(params.makeable) === '1' || firstParam(params.onlyMakeable) === '1',
        onlyFavorites: firstParam(params.favorites) === '1' || firstParam(params.onlyFavorites) === '1',
        sortBy:        firstParam(params.sortBy) ?? null,
        sortOrder:     sortOrder === 'desc' ? 'desc' : 'asc',
    }
}

function sameFilters(a: FilterState, b: FilterState): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
}

function routeParamsFromState(search: string, filters: FilterState): Record<string, string | undefined> {
    return {
        search:    search.trim() || undefined,
        difficulty: filters.difficulty ?? undefined,
        alcoholic: filters.isAlcoholic === null ? undefined : String(filters.isAlcoholic),
        flavors:   filters.flavors.length ? filters.flavors.join(',') : undefined,
        occasions: filters.occasions.length ? filters.occasions.join(',') : undefined,
        makeable:  filters.onlyMakeable ? '1' : undefined,
        favorites: filters.onlyFavorites ? '1' : undefined,
        sortBy:    filters.sortBy ?? undefined,
        sortOrder: filters.sortBy ? filters.sortOrder : undefined,
    }
}

export default function CocktailsScreen() {
    const insets = useSafeAreaInsets()
    const { width } = useWindowDimensions()
    const { controlBottom: tabControlBottom, getScrollPadding } = useFloatingTabBarLayout(insets.bottom)
    const tabScrollPadding = getScrollPadding(92)
    const routeParams = useLocalSearchParams() as Record<string, string | string[] | undefined>
    const [search, setSearch]         = useState(() => firstParam(routeParams.search) ?? '')
    const [showFilter, setShowFilter] = useState(false)
    const [filters, setFilters]       = useState<FilterState>(() => filtersFromParams(routeParams))
    const debouncedSearch             = useDebouncedValue(search, 350)
    const tour                        = useProductTour()

    const routeStateKey = JSON.stringify(routeParamsFromState(firstParam(routeParams.search) ?? '', filtersFromParams(routeParams)))
    useEffect(() => {
        const nextSearch = firstParam(routeParams.search) ?? ''
        const nextFilters = filtersFromParams(routeParams)

        if (nextSearch !== search) setSearch(nextSearch)
        if (!sameFilters(nextFilters, filters)) setFilters(nextFilters)
        // Route params are the source when external navigation updates this tab.
    }, [routeStateKey])

    const localStateKey = JSON.stringify(routeParamsFromState(search, filters))
    useEffect(() => {
        router.setParams(routeParamsFromState(search, filters))
    }, [localStateKey, search, filters])

    const { data: favoriteIds = [] }  = useFavoriteIds()
    const { data: makeableList = [] } = useMakeableCocktails(10)
    const { data: pantryItems = [] } = usePantryItems()
    const { data: derivations = {} as DerivationMap } = useDerivations()
    const toggleFav                   = useToggleFavorite()

    const hasExplicitSort = Boolean(filters.sortBy)
    const columnCount = width >= TABLET_GRID_MIN_WIDTH ? 3 : 2
    const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds])
    const makeableMap = useMemo(
        () => new Map(makeableList.map(c => [c.id, c])),
        [makeableList]
    )
    const makeableIds = useMemo(
        () => new Set(makeableList.filter(isMakeableCocktailNow).map(c => c.id)),
        [makeableList]
    )
    const pantryMap = useMemo(() => {
        const map: Record<string, UserPantryItemDTO> = {}
        for (const item of pantryItems) {
            map[item.ingredientId] = item
        }
        return map
    }, [pantryItems])
    const pantryIngredientIds = useMemo(
        () => new Set(pantryItems.filter(item => item.isInPantry).map(item => item.ingredientId)),
        [pantryItems]
    )

    const params = {
        search:        debouncedSearch || undefined,
        difficulty:    filters.difficulty   ?? undefined,
        isAlcoholic:   filters.isAlcoholic  ?? undefined,
        flavors:       filters.flavors.length   ? filters.flavors   : undefined,
        occasions:     filters.occasions.length ? filters.occasions  : undefined,
        onlyFavorites: filters.onlyFavorites || undefined,
        favoriteIds:   filters.onlyFavorites ? favoriteIds : undefined,
        makeableIds:   filters.onlyMakeable
            ? makeableList.filter(isMakeableCocktailNow).map(c => c.id)
            : undefined,
        sortBy:        filters.sortBy ?? undefined,
        sortOrder:     filters.sortBy ? filters.sortOrder : undefined,
        includeIngredients: true,
        limit:         20,
    }

    const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteCocktails(params)

    const rawServerCocktails: CocktailDTO[] = useMemo(
        () => data?.pages.flatMap(p => Array.isArray(p.data) ? p.data : []) ?? [],
        [data]
    )
    const cocktails: CocktailDTO[] = useMemo(() => {
        if (hasExplicitSort || filters.onlyMakeable || filters.onlyFavorites || favoriteIds.length === 0) {
            return rawServerCocktails
        }

        return [
            ...rawServerCocktails.filter(cocktail => favoriteSet.has(cocktail.id)),
            ...rawServerCocktails.filter(cocktail => !favoriteSet.has(cocktail.id)),
        ]
    }, [favoriteIds.length, favoriteSet, filters.onlyFavorites, filters.onlyMakeable, hasExplicitSort, rawServerCocktails])
    const pantryProgressByCocktailId = useMemo(() => {
        const progress = new Map<string, PantryProgress>()
        for (const cocktail of cocktails) {
            const value = computePantryProgress(cocktail.ingredients, pantryMap, pantryIngredientIds, derivations)
            if (value) progress.set(cocktail.id, value)
        }
        return progress
    }, [cocktails, pantryMap, pantryIngredientIds, derivations])
    const total = data?.pages[0]?.meta?.total ?? cocktails.length

    const activeFilterCount =
        (filters.difficulty ? 1 : 0) +
        (filters.isAlcoholic !== null ? 1 : 0) +
        filters.flavors.length +
        filters.occasions.length +
        (filters.onlyMakeable ? 1 : 0) +
        (filters.onlyFavorites ? 1 : 0)

    const handleFavPress = useCallback((id: string, isFav: boolean) => {
        toggleFav.mutate({ cocktailId: id, isFav })
    }, [toggleFav])

    const openFilters = useCallback(() => {
        setShowFilter(true)
    }, [])

    const openCocktail = useCallback((cocktail: CocktailDTO) => {
        if (tour.isStep('pick')) {
            tour.selectCocktail(cocktail)
            return
        }
        router.push(`/cocktail/${cocktail.id}`)
    }, [tour])

    const gridRows = useMemo(() => {
        const rows: CocktailDTO[][] = []
        for (let i = 0; i < cocktails.length; i += columnCount) {
            rows.push(cocktails.slice(i, i + columnCount))
        }
        return rows
    }, [cocktails, columnCount])

    const skeletonRows = useMemo(() => {
        const rows: string[][] = []
        for (let i = 0; i < SKELETONS.length; i += columnCount) {
            rows.push(SKELETONS.slice(i, i + columnCount))
        }
        return rows
    }, [columnCount])

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            {/* Hero header */}
            <View style={s.heroHeader}>
                <Text style={s.eyebrow}>The library</Text>
                <View style={{ height: 8 }} />
                <Text style={s.headline}>Cocktails</Text>
                <View style={{ height: 4 }} />
                <Text style={s.subLine}>
                    {isLoading ? '…' : `${total} recipes · ${makeableIds.size} you can make right now`}
                </Text>

                {/* Search */}
                <View style={s.searchRow}>
                    <View style={s.searchWrap}>
                        <Ionicons name="search-outline" size={16} color={C.mute} />
                        <TextInput
                            style={s.searchInput}
                            accessibilityLabel="Search cocktails"
                            placeholder="Search drinks, ingredients…"
                            placeholderTextColor={C.mute}
                            value={search}
                            onChangeText={setSearch}
                            returnKeyType="search"
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        {search.length > 0 ? (
                            <TouchableOpacity
                                onPress={() => setSearch('')}
                                accessibilityRole="button"
                                accessibilityLabel="Clear cocktail search"
                                hitSlop={8}
                            >
                                <Ionicons name="close-circle" size={16} color={C.mute} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </View>

            {/* Filter summary row */}
            <View style={s.summaryRow}>
                <Text style={s.summaryText}>
                    Showing <Text style={s.summaryBold}>{isLoading ? '…' : total}</Text>
                    {`  ·  sorted by ${sortSummary(filters)}`}
                </Text>
                <TouchableOpacity
                    style={s.sortBtn}
                    onPress={openFilters}
                    accessibilityRole="button"
                    accessibilityLabel="Open cocktail sort options"
                >
                    <Ionicons name="arrow-down" size={12} color={C.bronze} />
                    <Text style={s.sortBtnText}>Sort</Text>
                </TouchableOpacity>
            </View>

            {/* Grid */}
            {isLoading ? (
                <ScrollView contentContainerStyle={s.grid}>
                    {skeletonRows.map((row, rowIndex) => (
                        <View key={`sk-row-${rowIndex}`} style={s.gridRow}>
                            {row.map(id => <GridCardSkeleton key={id} />)}
                            {Array.from({ length: columnCount - row.length }, (_, i) => (
                                <View key={`sk-ghost-${i}`} style={s.gridCardGhost} />
                            ))}
                        </View>
                    ))}
                </ScrollView>
            ) : cocktails.length === 0 ? (
                <View style={s.empty}>
                    <Ionicons name="wine-outline" size={42} color={C.mute} />
                    <Text style={s.emptyText}>No cocktails found</Text>
                    <Text style={s.emptySub}>Try adjusting your search or filters</Text>
                </View>
            ) : (
                <FlashList
                    key={columnCount}
                    data={gridRows}
                    renderItem={({ item }) => (
                        <View style={s.gridRow}>
                            {item.map(cocktail => (
                                <GridCard
                                    key={cocktail.id}
                                    cocktail={cocktail}
                                    makeableItem={makeableMap.get(cocktail.id)}
                                    pantryProgress={pantryProgressByCocktailId.get(cocktail.id)}
                                    isFav={favoriteSet.has(cocktail.id)}
                                    isMakeable={makeableIds.has(cocktail.id)}
                                    tourTarget={false}
                                    onFav={handleFavPress}
                                    onOpen={openCocktail}
                                />
                            ))}
                            {Array.from({ length: columnCount - item.length }, (_, i) => (
                                <View key={`ghost-${i}`} style={s.gridCardGhost} />
                            ))}
                        </View>
                    )}
                    keyExtractor={(item) => item.map(c => c.id).join('-')}
                    contentContainerStyle={s.grid}
                    onRefresh={refetch}
                    refreshing={isRefetching}
                    onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        <View style={{ height: tabScrollPadding, alignItems: 'center', paddingTop: 14 }}>
                            {isFetchingNextPage && <ActivityIndicator size="small" color={C.bronze} />}
                        </View>
                    }
                />
            )}

            {/* Floating filter FAB */}
            <TouchableOpacity
                style={[s.fab, { bottom: tabControlBottom }]}
                onPress={openFilters}
                accessibilityRole="button"
                accessibilityLabel={
                    activeFilterCount > 0
                        ? `Open cocktail filters, ${activeFilterCount} active`
                        : 'Open cocktail filters'
                }
            >
                <Ionicons name="funnel-outline" size={15} color="#f5ece0" />
                <Text style={s.fabText}>Filters</Text>
                {activeFilterCount > 0 ? (
                    <View style={s.fabBadge}>
                        <Text style={s.fabBadgeText}>{activeFilterCount}</Text>
                    </View>
                ) : null}
            </TouchableOpacity>

            <FilterSheet
                visible={showFilter}
                filters={filters}
                onChange={setFilters}
                onClose={() => setShowFilter(false)}
            />
        </View>
    )
}

interface GridCardProps {
    cocktail:      CocktailDTO
    makeableItem?: MakeableCocktail
    pantryProgress?: PantryProgress
    isFav:         boolean
    isMakeable:    boolean
    tourTarget?:   boolean
    onFav:         (id: string, isFav: boolean) => void
    onOpen:        (cocktail: CocktailDTO) => void
}

function GridCard({ cocktail, makeableItem, pantryProgress, isFav, isMakeable, tourTarget, onFav, onOpen }: GridCardProps) {
    const bg = toneForId(cocktail.id)
    const hasPantryProgress = (pantryProgress?.requiredCount ?? 0) > 0
    const requiredFromIngredients = cocktail.ingredients?.filter(isBlockingCocktailIngredient).length ?? 0
    const requiredCount = hasPantryProgress
        ? pantryProgress!.requiredCount
        : makeableItem?.requiredCount ?? requiredFromIngredients
    const pantryCount = hasPantryProgress
        ? pantryProgress!.pantryCount
        : requiredCount > 0
            ? Math.max(0, Math.min(requiredCount, makeableItem ? makeableItem.requiredCount - makeableItem.missingCount : 0))
            : null
    const difficultyLabel = cocktail.difficulty
        ? cocktail.difficulty.charAt(0).toUpperCase() + cocktail.difficulty.slice(1, 15)
        : ''
    const pantryLabel = pantryCount !== null ? `${pantryCount}/${requiredCount} pantry` : ''
    const makeableLabel = 'Makeable'
    const metaLabel = [difficultyLabel, pantryLabel].filter(Boolean).join(' · ')

    return (
        <Pressable
            style={({ pressed }) => [gc.card, tourTarget && gc.tourTarget, pressed && { opacity: 0.9 }]}
            onPress={() => onOpen(cocktail)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${cocktail.name}`}
        >
            <View style={[gc.img, { backgroundColor: bg }]}>
                {cocktail.imageUrl ? (
                    <Image
                        source={cocktail.imageUrl}
                        style={gc.imgPhoto}
                        accessibilityRole="image"
                        accessibilityLabel={`${cocktail.name} image`}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                    />
                ) : (
                    <View style={gc.imgSheen} />
                )}

                {isMakeable ? (
                    <View style={gc.makeableBadge}>
                        <Ionicons name="checkmark-circle" size={11} color={C.bronze} />
                        <Text style={gc.makeableBadgeText}>{makeableLabel}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={gc.favBtn}
                    onPress={() => onFav(cocktail.id, isFav)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={isFav ? `Remove ${cocktail.name} from favorites` : `Add ${cocktail.name} to favorites`}
                    accessibilityState={{ selected: isFav }}
                >
                    <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={16} color={C.bronze} />
                </TouchableOpacity>
            </View>

            <View style={gc.body}>
                <Text style={gc.name} numberOfLines={1}>{cocktail.name}</Text>
                <View style={{ height: 4 }} />
                <View style={gc.meta}>
                    {cocktail.avgRating && cocktail.avgRating > 0 ? (
                        <View style={gc.metaItem}>
                            <Ionicons name="star" size={11} color={C.mute} />
                            <Text style={gc.metaText}>{cocktail.avgRating.toFixed(1)}</Text>
                        </View>
                    ) : null}
                    <Text style={[gc.metaText, gc.metaSummary]} numberOfLines={1}>
                        {metaLabel}
                    </Text>
                </View>
            </View>
        </Pressable>
    )
}

function GridCardSkeleton() {
    return (
        <View style={gc.card}>
            <Skeleton height={140} width="100%" borderRadius={0} />
            <View style={{ padding: 12, gap: 6 }}>
                <Skeleton height={14} width="75%" borderRadius={4} />
                <Skeleton height={11} width="50%" borderRadius={4} />
            </View>
        </View>
    )
}

const s = StyleSheet.create({
    root:        { flex: 1, backgroundColor: C.cream },

    // Hero header
    heroHeader:  { backgroundColor: '#f0ebe3', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
    eyebrow:     { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    headline:    { fontFamily: F.head, fontStyle: 'italic', fontSize: 24, fontWeight: '400', color: C.ink, lineHeight: 28 },
    subLine:     { fontSize: 12, color: C.mute },
    searchRow:   { marginTop: 10 },
    searchWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 0, borderWidth: 1, borderColor: C.border, gap: 8, minHeight: 38 },
    searchInput: { flex: 1, height: 36, paddingVertical: 0, fontSize: 13, color: C.ink },

    // Summary row
    summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
    summaryText: { fontSize: 11, color: C.mute, letterSpacing: 0.5 },
    summaryBold: { color: C.ink, fontWeight: '700' },
    sortBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sortBtnText: { fontFamily: F.mono, fontSize: 10, color: C.bronze },

    // Grid
    grid:        { paddingHorizontal: 14, paddingTop: 2 },
    gridRow:     { flexDirection: 'row', gap: 14, marginBottom: 14 },
    gridCardGhost: { flex: 1 },

    // Empty
    empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyText:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 20, color: C.ink },
    emptySub:    { fontSize: 13, color: C.mute },

    // FAB
    fab:         { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bronze, paddingHorizontal: 16, height: 44, borderRadius: 999, shadowColor: C.bronze, shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
    fabText:     { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: '#f5ece0' },
    fabBadge:    { backgroundColor: C.bronzeLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
    fabBadgeText:{ fontFamily: F.mono, fontSize: 9, color: '#fff' },
})

const gc = StyleSheet.create({
    card:              { flex: 1, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    tourTarget:        {
        borderColor: C.bronze,
        borderWidth: 2.5,
        backgroundColor: 'rgba(245,236,224,0.55)',
        shadowColor: C.bronze,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 8,
    },
    img:               { height: 140, position: 'relative' },
    imgPhoto:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    imgSheen:          { position: 'absolute', top: 0, left: 0, right: '60%', bottom: 0, backgroundColor: 'rgba(255,255,255,0.22)' },
    makeableBadge:     { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(251,249,246,0.92)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    makeableBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: C.bronze },
    favBtn:            { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(251,249,246,0.92)', alignItems: 'center', justifyContent: 'center' },
    body:              { padding: 12, paddingBottom: 14 },
    name:              { fontFamily: F.head, fontStyle: 'italic', fontSize: 17, fontWeight: '400', color: C.ink },
    meta:              { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaItem:          { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText:          { fontFamily: F.mono, fontSize: 10, color: C.mute },
    metaSummary:       { flex: 1, flexShrink: 1 },
})
