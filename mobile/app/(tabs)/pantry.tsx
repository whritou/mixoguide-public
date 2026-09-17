import { useState, useMemo } from 'react'
import type { ComponentProps } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Pressable, type DimensionValue, type GestureResponderEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { usePantryItems, useMoveToPantry } from '@/features/pantry/hooks'
import { useMakeableCocktails } from '@/features/cocktails/hooks'
import { usePlannedCollections } from '@/features/planner/hooks'
import { AddPantryItemSheet } from '@/components/pantry/AddPantryItemSheet'
import { RestockPantrySheet } from '@/components/pantry/RestockPantrySheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFloatingTabBarLayout } from '@/components/navigation/FloatingTabBarLayoutContext'
import { isRestockCandidate } from '@/lib/pantryRestock'
import { C, F, toneForId } from '@/theme/brand'
import { isMakeableCocktailNow, type UserPantryItemDTO } from '@mixoguide/shared'
import type { PlannedCollectionDTO } from '@mixoguide/shared'

type Segment = 'stock' | 'low' | 'shopping'
type IconName = ComponentProps<typeof Ionicons>['name']
type StockLevel = 'out' | 'low' | 'medium' | 'full'

const CAP_BY_UNIT: Record<string, number> = {
    ml: 750, cl: 75, l: 1, oz: 25, g: 1000, kg: 1,
    pcs: 8, pieces: 8, piece: 8, zest: 8, slice: 8,
}

const CATEGORY_ORDER = [
    'Spirit',
    'Liqueur',
    'Bitters',
    'Fortified Wine',
    'Wine',
    'Beer & Cider',
    'Carbonated Mixer',
    'Juice',
    'Sweetener',
    'Fresh Produce',
    'Dairy & Egg',
    'Garnish',
    'Other',
]

function fillPct(qty: number, unit: string): number {
    const cap = CAP_BY_UNIT[String(unit).toLowerCase()] ?? 100
    if (qty <= 0) return 0
    return Math.min(100, Math.max(0, (qty / cap) * 100))
}

function stockLevel(item: UserPantryItemDTO): StockLevel {
    if (item.isInfinite) return 'full'
    if (item.quantity <= 0) return 'out'
    const pct = fillPct(item.quantity, item.unitLeft)
    if (pct < 25) return 'low'
    if (pct < 70) return 'medium'
    return 'full'
}

function isExpiringSoon(item: UserPantryItemDTO): boolean {
    if (!item.expirationDate) return false
    const daysLeft = (new Date(item.expirationDate).getTime() - Date.now()) / 86_400_000
    return daysLeft <= 7
}

function groupByCategory(items: UserPantryItemDTO[]) {
    const map = new Map<string, UserPantryItemDTO[]>()

    for (const item of items) {
        const cat = item.ingredient?.type?.name ?? 'Other'
        if (!map.has(cat)) map.set(cat, [])
        map.get(cat)!.push(item)
    }

    return Array.from(map.entries())
        .map(([name, items]) => ({ name, items }))
        .sort((a, b) => {
            const ai = CATEGORY_ORDER.indexOf(a.name)
            const bi = CATEGORY_ORDER.indexOf(b.name)

            if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
            if (ai === -1) return 1
            if (bi === -1) return -1

            return ai - bi
        })
}
export default function PantryScreen() {
    const insets = useSafeAreaInsets()
    const [segment, setSegment]         = useState<Segment>('stock')
    const [showAddSheet, setShowAdd]    = useState(false)
    const [showRestockSheet, setShowRestock] = useState(false)
    const [editItem, setEditItem]       = useState<UserPantryItemDTO | null>(null)
    const { controlBottom: tabControlBottom, getScrollPadding } = useFloatingTabBarLayout(insets.bottom)
    const tabScrollPadding = getScrollPadding(92)

    const { data: allItems = [], isLoading: pantryLoading }   = usePantryItems()
    const { data: makeable = [], isLoading: makeableLoading } = useMakeableCocktails()
    const { data: collections = [] }                          = usePlannedCollections()

    const pantryItems   = useMemo(() => allItems.filter(i => i.isInPantry),        [allItems])
    const shoppingItems = useMemo(() => allItems.filter(i => i.isInShoppingList),   [allItems])
    const lowItems      = useMemo(() => pantryItems.filter(isRestockCandidate),      [pantryItems])
    const restockItems  = lowItems
    const readyCount    = useMemo(() => makeable.filter(isMakeableCocktailNow).length, [makeable])

    const categories = useMemo(() => groupByCategory(pantryItems), [pantryItems])

    const isLoading = pantryLoading || makeableLoading

    function openAddIngredient() {
        setShowAdd(true)
    }

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            {/* Bronze header card */}
            <View style={s.headerCard}>
                {/* Top-right radial sheen */}
                <View style={s.headerSheen} />
                <View style={s.headerPad}>
                    <Text style={s.headerEyebrow}>Your stock</Text>
                    <View style={{ height: 5 }} />
                    <Text style={s.headerTitle}>My pantry</Text>
                    <View style={s.headerBottom}>
                        <View style={s.headerStats}>
                            {([
                                { v: pantryItems.length, l: 'Items' },
                                { v: lowItems.length,    l: 'Low' },
                                { v: readyCount,         l: 'Makeable' },
                            ] as { v: number; l: string }[]).map((st, i) => (
                                <View key={i} style={s.headerStat}>
                                    <Text style={s.headerStatValue}>{st.v}</Text>
                                    <View style={{ height: 2 }} />
                                    <Text style={s.headerStatLabel}>{st.l}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={s.tabs}>
                {([
                    { key: 'stock',    label: 'In stock' },
                    { key: 'low',      label: `Low${lowItems.length ? ` (${lowItems.length})` : ''}` },
                    { key: 'shopping', label: 'Shopping' },
                ] as { key: Segment; label: string }[]).map(t => {
                    const on = segment === t.key
                    return (
                        <TouchableOpacity key={t.key} style={s.tab} onPress={() => setSegment(t.key)}>
                            <Text style={[s.tabText, on && s.tabTextActive]}>{t.label}</Text>
                            <View style={[s.tabUnderline, on && s.tabUnderlineActive]} />
                        </TouchableOpacity>
                    )
                })}
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={s.skeletons}>
                    {Array.from({ length: 6 }, (_, i) => (
                        <View key={i} style={s.skeletonRow}>
                            <Skeleton width={36} height={36} borderRadius={10} />
                            <View style={{ flex: 1, gap: 6 }}>
                                <Skeleton height={14} width="65%" borderRadius={4} />
                                <Skeleton height={4} width="100%" borderRadius={2} />
                                <Skeleton height={11} width="40%" borderRadius={4} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : segment === 'stock' ? (
                <StockTab
                    categories={categories}
                    bottomPad={tabScrollPadding}
                    onEdit={setEditItem}
                />
            ) : segment === 'low' ? (
                <LowTab
                    items={lowItems}
                    bottomPad={tabScrollPadding}
                    onEdit={setEditItem}
                />
            ) : (
                <ShoppingTab
                    items={shoppingItems}
                    collections={collections.filter(c => c.status !== 'done')}
                    bottomPad={tabScrollPadding}
                    onEdit={setEditItem}
                />
            )}

            {/* FABs */}
            <View style={[s.fabRow, { bottom: tabControlBottom }]}>
                {restockItems.length > 0 && (
                    <TouchableOpacity
                        style={s.restockFab}
                        onPress={() => setShowRestock(true)}
                        accessibilityRole="button"
                        accessibilityLabel={`Restock ${restockItems.length} low or empty pantry items`}
                    >
                        <Ionicons name="archive-outline" size={17} color="#f5ece0" />
                        <Text style={s.restockFabText}>Restock</Text>

                        <View style={s.restockFabCount}>
                            <Text style={s.restockFabCountText}>{restockItems.length}</Text>
                        </View>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={s.fab}
                    onPress={openAddIngredient}
                >
                    <Ionicons name="add" size={24} color="#f5ece0" />
                </TouchableOpacity>
            </View>

            <AddPantryItemSheet visible={showAddSheet} onClose={() => setShowAdd(false)} />
            <RestockPantrySheet
                visible={showRestockSheet}
                onClose={() => setShowRestock(false)}
                items={restockItems}
            />
            <AddPantryItemSheet
                visible={editItem !== null}
                item={editItem ?? undefined}
                onClose={() => setEditItem(null)}
            />
        </View>
    )
}

// ── In stock tab ──────────────────────────────────────────────────────────────

function StockTab({ categories, bottomPad, onEdit }: {
    categories: { name: string; items: UserPantryItemDTO[] }[]
    bottomPad:  number
    onEdit:     (item: UserPantryItemDTO) => void
}) {
    if (categories.length === 0) {
        return (
            <EmptyState
                icon="sparkles-outline"
                title="Your pantry is empty"
                sub="Tap the plus button to add your first ingredient"
            />
        )
    }
    return (
        <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: bottomPad }}
            showsVerticalScrollIndicator={false}
        >
            {categories.map(cat => (
                <CategorySection key={cat.name} category={cat} onEdit={onEdit} />
            ))}
        </ScrollView>
    )
}

function CategorySection({ category, onEdit }: {
    category: { name: string; items: UserPantryItemDTO[] }
    onEdit:   (item: UserPantryItemDTO) => void
}) {
    return (
        <View style={cat.section}>
            <View style={cat.sectionHeader}>
                <Text style={cat.eyebrow}>{category.name}</Text>
                <Text style={cat.count}>{category.items.length} items</Text>
            </View>
            <View style={cat.card}>
                {category.items.map((item, i) => (
                    <PantryRow
                        key={item.id}
                        item={item}
                        last={i === category.items.length - 1}
                        onEdit={() => onEdit(item)}
                    />
                ))}
            </View>
        </View>
    )
}

function PantryRow({ item, last, onEdit }: { item: UserPantryItemDTO; last: boolean; onEdit: () => void }) {
    const name = item.ingredient?.name ?? 'Unknown'
    const sub  = item.ingredient?.subType?.name ?? item.ingredient?.type?.name ?? ''
    const infinite = !!item.isInfinite
    const level = stockLevel(item)
    const pct = infinite ? 100 : fillPct(item.quantity, item.unitLeft)
    const displayPct = pct > 0 && pct < 6 ? 6 : pct
    const barWidth = `${displayPct}%` as DimensionValue
    const out = level === 'out'
    const low = level === 'low'
    const medium = level === 'medium'
    const needsRestock = out || low
    const attention = needsRestock || isExpiringSoon(item)

    return (
        <TouchableOpacity
            style={[cat.row, !last && cat.rowBorder]}
            onPress={onEdit}
            activeOpacity={0.7}
        >
            <View style={{ flex: 1 }}>
                <View style={cat.rowTop}>
                    <Text style={cat.itemName}>{name}</Text>
                    {infinite ? (
                        <View style={cat.infiniteBadge}>
                            <Ionicons name="infinite" size={12} color={C.bronze} />
                            <Text style={cat.infiniteBadgeText}>Always stocked</Text>
                        </View>
                    ) : (
                        <View style={cat.qtyCluster}>
                            {needsRestock ? (
                                <View style={[cat.stockBadge, out ? cat.stockBadgeOut : cat.stockBadgeLow]}>
                                    <Text style={[cat.stockBadgeText, out ? cat.stockBadgeTextOut : cat.stockBadgeTextLow]}>
                                        {out ? 'Out' : 'Low'}
                                    </Text>
                                </View>
                            ) : null}
                            <Text style={[cat.itemQty, out && cat.itemQtyOut, low && cat.itemQtyLow]}>
                                {item.quantity} {item.unitLeft}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={[cat.bar, out && cat.barOutTrack]}>
                    <View
                        style={[
                            cat.barFill,
                            out && cat.barFillOut,
                            low && cat.barFillLow,
                            medium && cat.barFillMedium,
                            level === 'full' && cat.barFillFull,
                            { width: barWidth },
                        ]}
                    />
                </View>
                <Text style={cat.itemSub}>
                    {sub}
                    {!infinite && item.expirationDate
                        ? ` · expires ${new Date(item.expirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : ''}
                    {needsRestock ? (out ? ' · out of stock' : ' · restock?') : attention ? ' · check soon' : ''}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.border} />
        </TouchableOpacity>
    )
}

// ── Low tab ───────────────────────────────────────────────────────────────────

function LowTab({ items, bottomPad, onEdit }: {
    items:     UserPantryItemDTO[]
    bottomPad: number
    onEdit:    (item: UserPantryItemDTO) => void
}) {
    if (items.length === 0) {
        return <EmptyState icon="checkmark-circle-outline" title="All stocked up" sub="No items are running low" />
    }
    return (
        <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: bottomPad }}
            showsVerticalScrollIndicator={false}
        >
            <View style={cat.card}>
                {items.map((item, i) => (
                    <PantryRow key={item.id} item={item} last={i === items.length - 1} onEdit={() => onEdit(item)} />
                ))}
            </View>
        </ScrollView>
    )
}

// ── Shopping tab ──────────────────────────────────────────────────────────────

function ShoppingTab({ items, collections, bottomPad, onEdit }: {
    items:       UserPantryItemDTO[]
    collections: PlannedCollectionDTO[]
    bottomPad:   number
    onEdit:      (item: UserPantryItemDTO) => void
}) {
    const hasContent = items.length > 0 || collections.length > 0
    if (!hasContent) {
        return <EmptyState icon="cart-outline" title="Shopping list is empty" sub="Add ingredients you need to buy" />
    }
    return (
        <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: bottomPad }}
            showsVerticalScrollIndicator={false}
        >
            {/* From events */}
            {collections.length > 0 && (
                <View style={sh.section}>
                    <View style={sh.sectionHeader}>
                        <Text style={sh.eyebrow}>From events</Text>
                        <Text style={sh.count}>{collections.length}</Text>
                    </View>
                    {collections.map(col => (
                        <CollectionShoppingCard
                            key={col.id}
                            collection={col}
                            onPress={() => router.push(`/planner/collection/${col.id}`)}
                        />
                    ))}
                </View>
            )}

            {/* Manual items */}
            {items.length > 0 && (
                <View style={sh.section}>
                    {collections.length > 0 && <Text style={sh.eyebrow}>My list</Text>}
                    <View style={cat.card}>
                        {items.map((item, i) => (
                            <ShoppingRow key={item.id} item={item} last={i === items.length - 1} onEdit={() => onEdit(item)} />
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    )
}

function CollectionShoppingCard({ collection, onPress }: {
    collection: PlannedCollectionDTO
    onPress: () => void
}) {
    const total    = collection.cocktails.length
    const isDone   = collection.status === 'done'
    const done     = isDone ? total : collection.cocktails.filter(c => (c as { status?: string }).status === 'done').length
    const progress = total > 0 ? done / total : 0
    const date     = new Date(collection.plannedFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const strips   = collection.cocktails.slice(0, 4)
    const progressWidth = `${progress * 100}%` as DimensionValue

    return (
        <Pressable
            style={({ pressed }) => [sh.colCard, pressed && { opacity: 0.9 }]}
            onPress={onPress}
        >
            {/* Colour accent bar from cocktail tones */}
            <View style={sh.colStrips}>
                {strips.length > 0
                    ? strips.map((c, i) => (
                        <View key={i} style={[sh.colStrip, { backgroundColor: toneForId(c.cocktailId ?? String(i)) }]} />
                    ))
                    : <View style={[sh.colStrip, { flex: 1, backgroundColor: C.bronzeLight }]} />}
            </View>

            <View style={sh.colBody}>
                <View style={{ flex: 1 }}>
                    <Text style={sh.colTitle} numberOfLines={1}>{collection.title}</Text>
                    <Text style={sh.colMeta}>
                        {date} · {total} cocktail{total !== 1 ? 's' : ''} · {collection.servings} servings
                    </Text>
                    <View style={sh.colTrack}>
                        <View style={[sh.colFill, { width: progressWidth }]} />
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.mute} />
            </View>
        </Pressable>
    )
}

function ShoppingRow({ item, last, onEdit }: { item: UserPantryItemDTO; last: boolean; onEdit: () => void }) {
    const moveMutation = useMoveToPantry()
    const name = item.ingredient?.name ?? 'Unknown'
    const sub  = item.ingredient?.type?.name ?? ''
    const shoppingQty = item.shoppingQuantity ?? 0

    function moveToPantry(e: GestureResponderEvent) {
        e.stopPropagation?.()
        if (shoppingQty <= 0 || moveMutation.isPending) return
        moveMutation.mutate({ ingredientId: item.ingredientId, amount: shoppingQty, unitLeft: item.unitLeft })
    }

    return (
        <TouchableOpacity style={[cat.row, !last && cat.rowBorder]} onPress={onEdit} activeOpacity={0.7}>
            <View style={[cat.iconCircle, { backgroundColor: C.creamWarm }]}>
                <Text style={cat.iconLetter}>{name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={cat.itemName}>{name}</Text>
                {sub ? <Text style={cat.itemSub}>{sub}</Text> : null}
            </View>
            <View style={cat.shoppingAction}>
                <Text style={cat.itemQty}>{shoppingQty || '—'} {item.unitLeft}</Text>
                <TouchableOpacity
                    style={[cat.moveBtn, moveMutation.isPending && cat.moveBtnDisabled]}
                    onPress={moveToPantry}
                    disabled={moveMutation.isPending || shoppingQty <= 0}
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${name} to pantry`}
                    hitSlop={6}
                >
                    <Ionicons name="archive-outline" size={13} color="#f5ece0" />
                    <Text style={cat.moveBtnText}>Pantry</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    )
}

function EmptyState({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
    return (
        <View style={s.empty}>
            <Ionicons name={icon} size={36} color={C.bronze} />
            <Text style={s.emptyTitle}>{title}</Text>
            <Text style={s.emptySub}>{sub}</Text>
        </View>
    )
}

const s = StyleSheet.create({
    root:    { flex: 1, backgroundColor: C.cream },

    // Bronze header card
    headerCard:       { margin: 16, marginBottom: 0, borderRadius: 20, overflow: 'hidden', backgroundColor: '#9a6b40', shadowColor: C.bronze, shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
    headerSheen:      { position: 'absolute', top: -42, right: -34, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(245,236,224,0.3)' },
    headerPad:        { padding: 15, paddingBottom: 13 },
    headerEyebrow:    { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' },
    headerTitle:      { fontFamily: F.head, fontStyle: 'italic', fontSize: 28, fontWeight: '400', color: '#f5ece0', lineHeight: 30 },
    headerBottom:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 },
    headerStats:      { flex: 1, flexDirection: 'row', gap: 32 },
    headerStat:       { flexShrink: 1 },
    headerStatValue:  { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, color: '#fff', lineHeight: 24 },
    headerStatLabel:  { fontSize: 8, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(245,236,224,0.75)' },

    // Tabs
    tabs:             { position: 'relative', flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 20 },
    tab:              { paddingVertical: 14 },
    tabText:          { fontSize: 13, fontWeight: '500', color: C.mute, letterSpacing: 0.4 },
    tabTextActive:    { color: C.ink },
    tabUnderline:     { height: 2, borderRadius: 1, backgroundColor: 'transparent', marginTop: 2 },
    tabUnderlineActive: { backgroundColor: C.bronze },

    // Skeleton
    skeletons:   { padding: 20, gap: 16 },
    skeletonRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },

    // Empty
    empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 64 },
    emptyTitle: { fontFamily: F.head, fontStyle: 'italic', fontSize: 20, color: C.ink },
    emptySub:   { fontSize: 13, color: C.mute, textAlign: 'center', paddingHorizontal: 40 },

    // FAB
    fabRow: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, },
    fab: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center', shadowColor: C.bronze, shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 5, },
    restockFab: { height: 48, borderRadius: 24, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.bronze, shadowColor: C.bronze, shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 5, },
    restockFabText: { fontSize: 11, fontWeight: '700', color: '#f5ece0', letterSpacing: 0.6, textTransform: 'uppercase', },
    restockFabCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(245,236,224,0.24)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, },
    restockFabCountText: { fontFamily: F.mono, fontSize: 10, color: '#fff', fontWeight: '700', },
})

const cat = StyleSheet.create({
    section:       { marginTop: 14 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
    eyebrow:       { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    count:         { fontFamily: F.mono, fontSize: 10, color: C.mute },
    card:          { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border },
    row:           { padding: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowBorder:     { borderBottomWidth: 1, borderBottomColor: C.border },
    rowTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    itemName:      { fontSize: 14, fontWeight: '600', color: C.ink, flex: 1 },
    itemQty:       { fontFamily: F.mono, fontSize: 12, color: C.bronze, fontWeight: '600' },
    itemQtyLow:    { color: '#b26a00' },
    itemQtyOut:    { color: '#b7352b' },
    qtyCluster:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stockBadge:    { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
    stockBadgeOut: { backgroundColor: '#f8d4cf' },
    stockBadgeLow: { backgroundColor: '#fde7c8' },
    stockBadgeText:{ fontFamily: F.mono, fontSize: 9, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
    stockBadgeTextOut: { color: '#a82c24' },
    stockBadgeTextLow: { color: '#986009' },
    bar:           { height: 5, borderRadius: 999, backgroundColor: '#eee1cf', marginTop: 6, overflow: 'hidden' },
    barOutTrack:   { backgroundColor: '#f4d9d4' },
    barFill:       { height: '100%', backgroundColor: C.bronze, borderRadius: 999 },
    barFillOut:    { backgroundColor: '#c73b32' },
    barFillLow:    { backgroundColor: '#e08b1f' },
    barFillMedium: { backgroundColor: '#d0b15a' },
    barFillFull:   { backgroundColor: '#5f8f61' },
    itemSub:       { fontSize: 11, color: C.mute, marginTop: 5 },

    // Shopping row
    iconCircle:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    iconLetter:    { fontFamily: F.head, fontStyle: 'italic', fontSize: 14, color: C.bronze },
    shoppingAction:{ alignItems: 'flex-end', gap: 6 },
    moveBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: C.bronze, paddingHorizontal: 10, paddingVertical: 6 },
    moveBtnDisabled:{ opacity: 0.55 },
    moveBtnText:   { fontSize: 10, fontWeight: '700', color: '#f5ece0', letterSpacing: 0.5, textTransform: 'uppercase' },

    infiniteBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: C.creamWarm },
    infiniteBadgeText: { fontFamily: F.mono, fontSize: 10, color: C.bronze, fontWeight: '600', letterSpacing: 0.3 },
})

const sh = StyleSheet.create({
    section:      { marginTop: 14 },
    sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    eyebrow:      { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze, marginBottom: 10 },
    count:        { fontFamily: F.mono, fontSize: 10, color: C.mute },

    colCard:      { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
    colStrips:    { flexDirection: 'row', height: 5 },
    colStrip:     { flex: 1 },
    colBody:      { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    colTitle:     { fontFamily: F.head, fontStyle: 'italic', fontSize: 17, color: C.ink, marginBottom: 3 },
    colMeta:      { fontFamily: F.mono, fontSize: 10, color: C.mute, marginBottom: 8 },
    colTrack:     { height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
    colFill:      { height: 3, backgroundColor: C.bronze, borderRadius: 2 },
})
