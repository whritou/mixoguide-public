import { useState, useEffect, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { FlashList } from '@shopify/flash-list'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useInfiniteIngredients } from '@/features/ingredients/hooks'
import { usePantryItems } from '@/features/pantry/hooks'
import { IngredientFilterSheet, IngredientFilterState, DEFAULT_INGREDIENT_FILTERS } from '@/components/ingredient/IngredientFilterSheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFloatingTabBarLayout } from '@/components/navigation/FloatingTabBarLayoutContext'
import { C, F, toneForId } from '@/theme/brand'
import type { IngredientSearchResult } from '@/api/endpoints/ingredients'
import type { UserPantryItemDTO } from '@mixoguide/shared'

type ListRow =
    | { kind: 'letter'; letter: string }
    | { kind: 'item';   item: IngredientSearchResult }

function buildAlphaRows(items: IngredientSearchResult[]): ListRow[] {
    const rows: ListRow[] = []
    let lastLetter = ''
    for (const item of items) {
        const letter = item.name[0]?.toUpperCase() ?? '#'
        if (letter !== lastLetter) {
            rows.push({ kind: 'letter', letter })
            lastLetter = letter
        }
        rows.push({ kind: 'item', item })
    }
    return rows
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

function filtersFromParams(params: Record<string, RouteParam>): IngredientFilterState {
    const sortBy = firstParam(params.sortBy)
    const sortOrder = firstParam(params.sortOrder)
    return {
        ...DEFAULT_INGREDIENT_FILTERS,
        types:       csvParam(params.types),
        subTypes:    csvParam(params.subTypes),
        isAlcoholic: boolParam(params.alcoholic),
        sortBy:      sortBy === 'abv' ? 'abv' : 'name',
        sortOrder:   sortOrder === 'desc' ? 'desc' : 'asc',
    }
}

function sameFilters(a: IngredientFilterState, b: IngredientFilterState): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
}

function routeParamsFromState(search: string, filters: IngredientFilterState): Record<string, string | undefined> {
    return {
        search:    search.trim() || undefined,
        types:     filters.types.length ? filters.types.join(',') : undefined,
        subTypes:  filters.subTypes.length ? filters.subTypes.join(',') : undefined,
        alcoholic: filters.isAlcoholic === null ? undefined : String(filters.isAlcoholic),
        sortBy:    filters.sortBy !== DEFAULT_INGREDIENT_FILTERS.sortBy ? filters.sortBy : undefined,
        sortOrder: filters.sortBy !== DEFAULT_INGREDIENT_FILTERS.sortBy || filters.sortOrder !== DEFAULT_INGREDIENT_FILTERS.sortOrder
            ? filters.sortOrder
            : undefined,
    }
}

export default function IngredientsScreen() {
    const insets = useSafeAreaInsets()
    const { controlBottom: tabControlBottom, getScrollPadding } = useFloatingTabBarLayout(insets.bottom)
    const tabScrollPadding = getScrollPadding(92)
    const routeParams = useLocalSearchParams() as Record<string, string | string[] | undefined>
    const [search, setSearch]       = useState(() => firstParam(routeParams.search) ?? '')
    const [showFilter, setShowFilter] = useState(false)
    const [filters, setFilters]     = useState<IngredientFilterState>(() => filtersFromParams(routeParams))
    const debouncedSearch           = useDebouncedValue(search, 350)

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

    const params = {
        search:      debouncedSearch || undefined,
        types:       filters.types.length    ? filters.types    : undefined,
        subTypes:    filters.subTypes.length ? filters.subTypes : undefined,
        isAlcoholic: filters.isAlcoholic ?? undefined,
        sortBy:      filters.sortBy,
        sortOrder:   filters.sortOrder,
    }

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteIngredients(params)
    const { data: pantryItems = [] } = usePantryItems()

    const items: IngredientSearchResult[] = data?.pages.flatMap(p => Array.isArray(p.data) ? p.data : []) ?? []
    const total = data?.pages[0]?.meta?.total ?? items.length

    const pantryMap = useMemo(() => {
        const map: Record<string, UserPantryItemDTO> = {}
        for (const p of pantryItems) map[p.ingredientId] = p
        return map
    }, [pantryItems])

    const rows: ListRow[] = useMemo(() => buildAlphaRows(items), [items])

    const activeFilterCount =
        filters.types.length +
        filters.subTypes.length +
        (filters.isAlcoholic !== null ? 1 : 0)

    function openIngredient(id: string) {
        router.push(`/ingredient/${id}`)
    }

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            {/* Hero header */}
            <View style={s.heroHeader}>
                <Text style={s.eyebrow}>The cellar</Text>
                <View style={{ height: 8 }} />
                <Text style={s.headline}>Ingredients</Text>
                <View style={{ height: 4 }} />
                <Text style={s.subLine}>
                    {isLoading ? '…' : `${total} in the library`}
                </Text>

                {/* Search */}
                <View style={s.searchRow}>
                    <View style={s.searchWrap}>
                        <Ionicons name="search-outline" size={16} color={C.mute} />
                        <TextInput
                            style={s.searchInput}
                            accessibilityLabel="Search ingredients"
                            placeholder="Search ingredients…"
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
                                accessibilityLabel="Clear ingredient search"
                                hitSlop={8}
                            >
                                <Ionicons name="close-circle" size={16} color={C.mute} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </View>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.chipRow}
                >
                    {filters.types.map(t => (
                        <Pressable
                            key={t}
                            style={s.chip}
                            onPress={() => setFilters(f => ({ ...f, types: f.types.filter(x => x !== t) }))}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${t} filter`}
                        >
                            <Text style={s.chipText}>{t}</Text>
                            <Ionicons name="close" size={12} color="rgba(255,255,255,0.8)" />
                        </Pressable>
                    ))}
                    {filters.subTypes.map(st => (
                        <Pressable
                            key={st}
                            style={s.chip}
                            onPress={() => setFilters(f => ({ ...f, subTypes: f.subTypes.filter(x => x !== st) }))}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${st} filter`}
                        >
                            <Text style={s.chipText}>{st}</Text>
                            <Ionicons name="close" size={12} color="rgba(255,255,255,0.8)" />
                        </Pressable>
                    ))}
                    {filters.isAlcoholic !== null && (
                        <Pressable
                            style={s.chip}
                            onPress={() => setFilters(f => ({ ...f, isAlcoholic: null }))}
                            accessibilityRole="button"
                            accessibilityLabel="Remove alcohol filter"
                        >
                            <Text style={s.chipText}>{filters.isAlcoholic ? 'Alcoholic' : 'Non-alcoholic'}</Text>
                            <Ionicons name="close" size={12} color="rgba(255,255,255,0.8)" />
                        </Pressable>
                    )}
                </ScrollView>
            )}

            {/* List */}
            {isLoading ? (
                <ScrollView contentContainerStyle={s.skeletonList}>
                    {Array.from({ length: 8 }, (_, i) => (
                        <View key={i} style={s.skeletonRow}>
                            <Skeleton width={44} height={44} borderRadius={14} />
                            <View style={{ flex: 1, gap: 6 }}>
                                <Skeleton height={14} width="55%" borderRadius={4} />
                                <Skeleton height={11} width="35%" borderRadius={4} />
                            </View>
                        </View>
                    ))}
                </ScrollView>
            ) : rows.length === 0 ? (
                <View style={s.empty}>
                    <Ionicons name="beaker-outline" size={42} color={C.mute} />
                    <Text style={s.emptyTitle}>Nothing found</Text>
                    <Text style={s.emptySub}>Try a different search or clear filters</Text>
                </View>
            ) : (
                <FlashList
                    data={rows}
                    keyExtractor={(row) => row.kind === 'letter' ? `letter-${row.letter}` : row.item.id}
                    renderItem={({ item: row }) => {
                        if (row.kind === 'letter') {
                            return <Text style={s.letterHeader}>{row.letter}</Text>
                        }
                        const pantryItem = pantryMap[row.item.id]
                        return (
                            <IngredientRow
                                item={row.item}
                                pantryItem={pantryItem}
                                onPress={() => openIngredient(row.item.id)}
                            />
                        )
                    }}
                    getItemType={row => row.kind}
                    contentContainerStyle={s.list}
                    onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        <View style={{ height: tabScrollPadding, alignItems: 'center', paddingTop: 14 }}>
                            {isFetchingNextPage && <ActivityIndicator size="small" color={C.bronze} />}
                        </View>
                    }
                />
            )}

            {/* Filter FAB */}
            <TouchableOpacity
                style={[s.fab, { bottom: tabControlBottom }]}
                onPress={() => setShowFilter(true)}
                accessibilityRole="button"
                accessibilityLabel={
                    activeFilterCount > 0
                        ? `Open ingredient filters, ${activeFilterCount} active`
                        : 'Open ingredient filters'
                }
            >
                <Ionicons name="funnel-outline" size={15} color="#f5ece0" />
                <Text style={s.fabText}>Filters</Text>
                {activeFilterCount > 0 && (
                    <View style={s.fabBadge}>
                        <Text style={s.fabBadgeText}>{activeFilterCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <IngredientFilterSheet
                visible={showFilter}
                filters={filters}
                onChange={setFilters}
                onClose={() => setShowFilter(false)}
            />
        </View>
    )
}

function IngredientRow({ item, pantryItem, onPress }: {
    item: IngredientSearchResult
    pantryItem: UserPantryItemDTO | undefined
    onPress: () => void
}) {
    const inPantry   = pantryItem?.isInPantry ?? false
    const inShopping = pantryItem?.isInShoppingList ?? false
    const bg         = toneForId(item.id)

    return (
        <Pressable
            style={({ pressed }) => [r.row, pressed && { opacity: 0.8 }]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name}`}
        >
            <View style={[r.thumb, { backgroundColor: bg }]}>
                {item.imageUrl ? (
                    <Image
                        source={item.imageUrl}
                        style={r.thumbImg}
                        accessibilityRole="image"
                        accessibilityLabel={`${item.name} image`}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                    />
                ) : (
                    <Ionicons name="beaker-outline" size={20} color="rgba(255,255,255,0.7)" />
                )}
            </View>

            <View style={r.info}>
                <Text style={r.name} numberOfLines={1}>{item.name}</Text>
                <Text style={r.sub} numberOfLines={1}>
                    {[item.type?.name, item.subType?.name].filter(Boolean).join(' · ')}
                    {item.brand ? (item.type?.name ? ' · ' : '') + item.brand : ''}
                </Text>
            </View>

            {inPantry ? (
                <View style={r.badgeHave}>
                    <Text style={r.badgeHaveText}>In pantry</Text>
                </View>
            ) : inShopping ? (
                <View style={r.badgeShop}>
                    <Text style={r.badgeShopText}>Shopping</Text>
                </View>
            ) : null}

            <Ionicons name="chevron-forward" size={20} color={C.mute} />
        </Pressable>
    )
}

const s = StyleSheet.create({
    root:         { flex: 1, backgroundColor: C.cream },

    heroHeader:   { backgroundColor: '#f0ebe3', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
    eyebrow:      { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    headline:     { fontFamily: F.head, fontStyle: 'italic', fontSize: 24, fontWeight: '400', color: C.ink, lineHeight: 28 },
    subLine:      { fontSize: 12, color: C.mute },
    searchRow:    { marginTop: 10 },
    searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 0, borderWidth: 1, borderColor: C.border, gap: 8, minHeight: 38 },
    searchInput:  { flex: 1, height: 36, paddingVertical: 0, fontSize: 13, color: C.ink },

    chipRow:      { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
    chip:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bronze, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
    chipText:     { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

    list:         { paddingHorizontal: 16, paddingTop: 6 },

    skeletonList: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
    skeletonRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },

    letterHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: C.bronze, paddingTop: 14, paddingBottom: 5, paddingHorizontal: 4 },

    empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
    emptyTitle:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 20, color: C.ink },
    emptySub:     { fontSize: 13, color: C.mute, textAlign: 'center', paddingHorizontal: 40 },

    fab:          { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bronze, paddingHorizontal: 16, height: 44, borderRadius: 999, shadowColor: C.bronze, shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
    fabText:      { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: '#f5ece0' },
    fabBadge:     { backgroundColor: C.bronzeLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 },
    fabBadgeText: { fontFamily: F.mono, fontSize: 9, color: '#fff' },
})

const r = StyleSheet.create({
    row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    thumb:        { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    thumbImg:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    info:         { flex: 1, minWidth: 0 },
    name:         { fontSize: 15, fontWeight: '600', color: C.ink },
    sub:          { fontSize: 11, color: C.mute, marginTop: 2 },
    badgeHave:    { backgroundColor: '#e8ece0', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    badgeHaveText:{ fontSize: 10, fontWeight: '700', color: '#6a7a5a', letterSpacing: 0.5 },
    badgeShop:    { backgroundColor: C.amber, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    badgeShopText:{ fontSize: 10, fontWeight: '700', color: C.bronze, letterSpacing: 0.5 },
})
