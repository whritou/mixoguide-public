import { useEffect, useState, type ComponentProps } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable, TextInput, FlatList, type DimensionValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import {
    usePlannedCollection, useGroceryList,
    useCompletePlannedCollection, useRemoveCocktailFromCollection,
    useAddCocktailToCollection, useCompleteCollectionCocktail,
} from '@/features/planner/hooks'
import { useCocktails } from '@/features/cocktails/hooks'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { AddIngredientsSheet } from '@/components/shared/AddIngredientsSheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { SwipeableSheet } from '@/components/ui/SwipeableSheet'
import { useActionDialog } from '@/components/ui/ActionDialog'
import { C, F, toneForId } from '@/theme/brand'
import { keys } from '@/lib/query-keys'
import type { GroceryItem } from '@/api/endpoints/planner'
import type { CocktailDTO, PlannedCollectionDTO } from '@mixoguide/shared'

type IconName = ComponentProps<typeof Ionicons>['name']
type CollectionCocktail = PlannedCollectionDTO['cocktails'][number] & { status?: 'planned' | 'done' }

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function fmtShortDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CollectionDetailScreen() {
    const { id, addCocktail } = useLocalSearchParams<{ id: string; addCocktail?: string | string[] }>()
    const insets  = useSafeAreaInsets()
    const addCocktailParam = Array.isArray(addCocktail) ? addCocktail[0] : addCocktail
    const { openActionDialog, actionDialog } = useActionDialog()

    const [showAddCocktail, setShowAddCocktail]     = useState(addCocktailParam === '1')
    const [showManageSheet, setShowManageSheet]     = useState(false)

    const { data: collection, isLoading }           = usePlannedCollection(id)
    const { data: groceries = [], isLoading: gLoad } = useGroceryList(id)
    const complete       = useCompletePlannedCollection()
    const completeCocktail = useCompleteCollectionCocktail()
    const removeCocktail = useRemoveCocktailFromCollection()

    useEffect(() => {
        if (addCocktailParam === '1') {
            setShowAddCocktail(true)
        }
    }, [addCocktailParam, id])

    if (isLoading || !collection) {
        return (
            <View style={[s.root, { paddingTop: insets.top }]}>
                <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={17} color={C.mute} />
                    <Text style={s.backText}>Back</Text>
                </TouchableOpacity>
                <View style={{ padding: 20, gap: 14 }}>
                    <Skeleton height={28} width="70%" />
                    <Skeleton height={16} width="45%" />
                    <Skeleton height={16} width="55%" />
                </View>
            </View>
        )
    }

    const isDone        = collection.status === 'done'
    const totalCocktails = collection.cocktails.length
    const doneCocktails  = isDone ? totalCocktails : collection.cocktails.filter(c => (c as CollectionCocktail).status === 'done').length
    const progress       = totalCocktails > 0 ? doneCocktails / totalCocktails : 0
    const progressWidth  = `${progress * 100}%` as DimensionValue
    const missingCount   = groceries.filter((g: GroceryItem) => g.missing > 0).length

    const pendingCocktails = collection.cocktails.filter(
        c => (c as CollectionCocktail).status !== 'done'
    )

    const completedCocktails = collection.cocktails.filter(
        c => (c as CollectionCocktail).status === 'done'
    )

    function handleComplete() {
        openActionDialog({
            title:        'Complete collection',
            message:      'This will mark all cocktails as made and update your pantry quantities.',
            confirmLabel: 'Complete',
            tone:         'success',
            icon:         'checkmark-circle-outline',
            onConfirm:    () => complete.mutate(id, { onSuccess: () => router.back() }),
        })
    }

    function handleRemoveCocktail(cocktailId: string, name: string) {
        openActionDialog({
            title:        'Remove cocktail',
            message:      `Remove "${name}" from this collection?`,
            confirmLabel: 'Remove',
            tone:         'danger',
            icon:         'close-circle-outline',
            onConfirm:    () => removeCocktail.mutate({ collectionId: id, cocktailId }),
        })
    }

    function handleCompleteCocktail(cocktailId: string, name: string) {
        openActionDialog({
            title:        'Mark as made',
            message:      `Mark "${name}" as made and update your pantry quantities?`,
            confirmLabel: 'Mark made',
            tone:         'success',
            icon:         'checkmark-circle-outline',
            onConfirm:    () => completeCocktail.mutate({ collectionId: id, cocktailId }),
        })
    }

    return (
        <>
            <ScrollView
                style={s.root}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero banner */}
                <View style={[s.banner, { paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={17} color="rgba(255,255,255,0.7)" />
                        <Text style={s.backTextHero}>Back</Text>
                    </TouchableOpacity>

                    {/* Tone strips */}
                    <View style={s.strips}>
                        {collection.cocktails.slice(0, 6).map((c, i) => (
                            <View key={i} style={[s.strip, { backgroundColor: toneForId(c.cocktailId ?? String(i)) }]} />
                        ))}
                        {collection.cocktails.length === 0 && [0,1,2,3,4,5].map(i => (
                            <View key={i} style={[s.strip, { backgroundColor: C.bronzeLight }]} />
                        ))}
                    </View>

                    <View style={s.bannerContent}>
                        <Text style={s.bannerDate}>{fmtShortDate(collection.plannedFor)}</Text>
                        <Text style={s.bannerTitle} numberOfLines={2}>{collection.title}</Text>
                        {isDone && (
                            <View style={s.donePill}>
                                <Ionicons name="checkmark" size={11} color="#5a7050" />
                                <Text style={s.donePillText}>Completed</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={s.body}>
                    {/* Meta row */}
                    <View style={s.metaRow}>
                        <MetaItem icon="calendar-outline" label={fmtDate(collection.plannedFor)} />
                        <MetaItem icon="people-outline" label={`${collection.servings} servings`} />
                        <MetaItem icon="wine-outline" label={`${totalCocktails} cocktails`} />
                    </View>

                    {/* Occasion tags */}
                    {collection.occasions.length > 0 && (
                        <View style={s.tagRow}>
                            {collection.occasions.map((o: string) => (
                                <View key={o} style={s.tag}>
                                    <Text style={s.tagText}>{o.replace(/_/g, ' ')}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Progress bar */}
                    {totalCocktails > 0 && (
                        <View style={s.progressCard}>
                            <View style={s.progressTop}>
                                <Text style={s.progressLabel}>{doneCocktails}/{totalCocktails} cocktails done</Text>
                                <Text style={s.progressPct}>{Math.round(progress * 100)}%</Text>
                            </View>
                            <View style={s.progressTrack}>
                                <View style={[s.progressFill, { width: progressWidth }]} />
                            </View>
                        </View>
                    )}

                    {/* Actions */}
                    {!isDone && (
                        <View style={s.actionRow}>
                            <TouchableOpacity
                                style={[s.completeBtn, complete.isPending && { opacity: 0.6 }]}
                                onPress={handleComplete}
                                disabled={complete.isPending}
                            >
                                <Ionicons name="checkmark" size={16} color="#fff" />
                                <Text style={s.completeBtnText}>
                                    {complete.isPending
                                        ? 'Completing…'
                                        : `Complete ${pendingCocktails.length} cocktail${pendingCocktails.length > 1 ? 's' : ''}`
                                    }
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.manageBtn}
                                onPress={() => setShowManageSheet(true)}
                                disabled={gLoad}
                            >
                                <Ionicons name="cart-outline" size={16} color={C.bronze} />
                                <Text style={s.manageBtnText}>Manage ingredients</Text>
                                {missingCount > 0 && (
                                    <View style={s.manageBadge}>
                                        <Text style={s.manageBadgeText}>{missingCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Pending cocktails */}
                    <Section label={`Cocktails to make (${pendingCocktails.length})`}>
                        {pendingCocktails.map((entry) => (
                            <Pressable
                                key={entry.id}
                                style={({ pressed }) => [s.cocktailRow, pressed && { opacity: 0.8 }]}
                                onPress={() => router.push(`/cocktail/${entry.cocktailId}`)}
                            >
                                <View style={[s.cocktailThumb, { backgroundColor: toneForId(entry.cocktailId) }]}>
                                    {entry.cocktail?.imageUrl ? (
                                        <Image
                                            source={entry.cocktail.imageUrl}
                                            style={StyleSheet.absoluteFillObject}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <Ionicons name="wine-outline" size={18} color="rgba(255,255,255,0.7)" />
                                    )}
                                </View>

                                <Text style={s.cocktailName} numberOfLines={1}>
                                    {entry.cocktail?.name ?? '—'}
                                </Text>

                                <View style={s.cocktailActions}>
                                    <TouchableOpacity
                                        style={s.cocktailMakeBtn}
                                        hitSlop={8}
                                        onPress={(event) => {
                                            event.stopPropagation()
                                            handleCompleteCocktail(
                                                entry.cocktailId,
                                                entry.cocktail?.name ?? 'this cocktail'
                                            )
                                        }}
                                    >
                                        <Ionicons name="checkmark" size={13} color="#5a7050" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        hitSlop={8}
                                        onPress={(event) => {
                                            event.stopPropagation()
                                            handleRemoveCocktail(
                                                entry.cocktailId,
                                                entry.cocktail?.name ?? ''
                                            )
                                        }}
                                    >
                                        <Ionicons name="close" size={18} color={C.mute} />
                                    </TouchableOpacity>
                                </View>
                            </Pressable>
                        ))}

                        {!isDone && totalCocktails > 0 && (
                            <TouchableOpacity
                                style={s.addCocktailBtn}
                                onPress={() => setShowAddCocktail(true)}
                            >
                                <Ionicons name="add" size={16} color={C.bronze} />
                                <Text style={s.addCocktailText}>Add cocktail</Text>
                            </TouchableOpacity>
                        )}
                    </Section>

                    {/* Completed cocktails */}
                    {completedCocktails.length > 0 && (
                        <Section label={`Completed cocktails (${completedCocktails.length})`}>
                            {completedCocktails.map((entry) => (
                                <Pressable
                                    key={entry.id}
                                    style={({ pressed }) => [
                                        s.cocktailRow,
                                        s.completedCocktailRow,
                                        pressed && { opacity: 0.8 }
                                    ]}
                                    onPress={() => router.push(`/cocktail/${entry.cocktailId}`)}
                                >
                                    <View style={[s.cocktailThumb, { backgroundColor: toneForId(entry.cocktailId) }]}>
                                        {entry.cocktail?.imageUrl ? (
                                            <Image
                                                source={entry.cocktail.imageUrl}
                                                style={StyleSheet.absoluteFillObject}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                            />
                                        ) : (
                                            <Ionicons name="wine-outline" size={18} color="rgba(255,255,255,0.7)" />
                                        )}
                                    </View>

                                    <Text style={s.cocktailName} numberOfLines={1}>
                                        {entry.cocktail?.name ?? '—'}
                                    </Text>

                                    <View style={s.completedBadge}>
                                        <Ionicons name="checkmark-circle" size={14} color="#5a7050" />
                                        <Text style={s.completedBadgeText}>Completed</Text>
                                    </View>
                                </Pressable>
                            ))}
                        </Section>
                    )}

                    {/* Grocery list section */}
                    <Section label="Grocery list">
                        {gLoad ? (
                            <ActivityIndicator color={C.bronze} style={{ marginVertical: 12 }} />
                        ) : groceries.length === 0 ? (
                            <Text style={s.emptyText}>Add cocktails to see what you need</Text>
                        ) : (
                            groceries.map((g: GroceryItem) => {
                                const ok = g.missing <= 0
                                return (
                                    <View key={g.ingredientId} style={s.groceryRow}>
                                        <View style={[s.groceryDot, ok ? s.groceryDotOk : s.groceryDotMiss]} />
                                        <View style={s.groceryInfo}>
                                            <Text style={s.groceryName}>{g.ingredientName}</Text>
                                            <Text style={s.groceryNeeded}>
                                                Need {g.totalNeeded}{g.unit ? ` ${g.unit}` : ''}
                                                {g.inPantry > 0 ? `  ·  Have ${g.inPantry}` : ''}
                                            </Text>
                                        </View>
                                        <View style={[s.groceryBadge, ok ? s.groceryBadgeOk : s.groceryBadgeMiss]}>
                                            {ok && <Ionicons name="checkmark" size={11} color="#5a7050" />}
                                            <Text style={[s.groceryBadgeText, ok ? s.groceryTextOk : s.groceryTextMiss]}>
                                                {ok ? 'Have it' : `Need ${g.missing}${g.unit ? ` ${g.unit}` : ''}`}
                                            </Text>
                                        </View>
                                    </View>
                                )
                            })
                        )}
                    </Section>
                </View>
            </ScrollView>

            <AddIngredientsSheet
                visible={showManageSheet}
                onClose={() => setShowManageSheet(false)}
                items={groceries}
                submitUrl={`/api/planned-collections/${id}/add-ingredients`}
                invalidateKeys={[keys.plannedCollections.grocery(id)]}
            />

            <AddCocktailModal
                visible={showAddCocktail}
                collectionId={id}
                existingIds={collection.cocktails.map((e) => e.cocktailId)}
                onClose={() => setShowAddCocktail(false)}
            />
            {actionDialog}
        </>
    )
}

function MetaItem({ icon, label }: { icon: IconName; label: string }) {
    return (
        <View style={s.metaItem}>
            <Ionicons name={icon} size={13} color={C.mute} />
            <Text style={s.metaText}>{label}</Text>
        </View>
    )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={s.section}>
            <Text style={s.sectionLabel}>{label}</Text>
            {children}
        </View>
    )
}

function AddCocktailModal({ visible, collectionId, existingIds, onClose }: {
    visible: boolean
    collectionId: string
    existingIds: string[]
    onClose: () => void
}) {
    const [search, setSearch] = useState('')
    const debouncedSearch     = useDebouncedValue(search, 350)
    const addMutation         = useAddCocktailToCollection()

    const { data, isFetching } = useCocktails({
        search:    debouncedSearch.trim() || undefined,
        limit:     20,
        sortBy:    'name',
        sortOrder: 'asc',
    }, visible)
    const cocktails: CocktailDTO[] = (data?.data ?? []).filter(c => !existingIds.includes(c.id))

    function handleAdd(cocktail: CocktailDTO) {
        addMutation.mutate(
            { collectionId, cocktailId: cocktail.id },
            { onSuccess: () => { setSearch(''); onClose() } }
        )
    }

    return (
        <SwipeableSheet visible={visible} onClose={onClose}>
            <View style={m.root}>
                <View style={m.header}>
                    <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
                        <Text style={m.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <View style={m.headerCenter}>
                        <Text style={m.eyebrow}>Add to event</Text>
                        <Text style={m.title}>Choose cocktail</Text>
                    </View>
                    <View style={{ width: 64 }} />
                </View>
                <View style={m.divider} />
                <View style={m.searchOuter}>
                    <View style={m.searchWrap}>
                        <Ionicons name="search-outline" size={16} color={C.mute} />
                        <TextInput
                            style={m.searchInput}
                            placeholder="Search cocktails…"
                            placeholderTextColor={C.mute}
                            value={search}
                            onChangeText={setSearch}
                            autoFocus
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        {search.length > 0 ? (
                            <TouchableOpacity
                                onPress={() => setSearch('')}
                                accessibilityRole="button"
                                accessibilityLabel="Clear event cocktail search"
                                hitSlop={8}
                            >
                                <Ionicons name="close-circle" size={16} color={C.mute} />
                            </TouchableOpacity>
                        ) : null}
                        {isFetching && <ActivityIndicator size="small" color={C.bronze} />}
                    </View>
                </View>

                <FlatList
                    data={cocktails}
                    keyExtractor={i => i.id}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={m.list}
                    renderItem={({ item }) => {
                        const bg = toneForId(item.id)
                        return (
                            <TouchableOpacity
                                style={m.row}
                                onPress={() => handleAdd(item)}
                                disabled={addMutation.isPending}
                                activeOpacity={0.8}
                            >
                                <View style={[m.avatar, { backgroundColor: bg }]}>
                                    <Text style={m.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View style={m.info}>
                                    <Text style={m.name} numberOfLines={1}>{item.name}</Text>
                                    <View style={m.metaRow}>
                                        <Text style={m.meta}>{item.difficulty}</Text>
                                        {item.preparationTime ? (
                                            <View style={m.metaItem}>
                                                <Ionicons name="time-outline" size={11} color={C.mute} />
                                                <Text style={m.meta}>{item.preparationTime} min</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                                <View style={m.addCircle}>
                                    <Ionicons name="add" size={18} color={C.bronze} />
                                </View>
                            </TouchableOpacity>
                        )
                    }}
                    ListEmptyComponent={
                        !isFetching ? (
                            <View style={m.hint}>
                                <Ionicons name="beaker-outline" size={32} color={C.border} />
                                <Text style={m.hintText}>
                                    {search.trim() ? 'No results' : 'No cocktails to add'}
                                </Text>
                            </View>
                        ) : null
                    }
                />
            </View>
        </SwipeableSheet>
    )
}

const s = StyleSheet.create({
    root:          { flex: 1, backgroundColor: C.cream },

    backRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingBottom: 10 },
    backText:      { fontSize: 15, color: C.mute, fontWeight: '500' },
    backTextHero:  { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

    banner:        { backgroundColor: C.heroDark, paddingBottom: 20, position: 'relative', overflow: 'hidden' },
    strips:        { flexDirection: 'row', height: 4, position: 'absolute', bottom: 0, left: 0, right: 0 },
    strip:         { flex: 1 },
    bannerContent: { paddingHorizontal: 16 },
    bannerDate:    { fontSize: 9, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
    bannerTitle:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 26, fontWeight: '400', color: '#f5ece0', lineHeight: 30, marginBottom: 8 },
    donePill:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e8ece0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    donePillText:  { fontSize: 11, fontWeight: '700', color: '#5a7050' },

    body:          { padding: 16, gap: 0 },

    metaRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12, marginTop: 4 },
    metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText:      { fontSize: 12, color: C.mute },

    tagRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    tag:           { backgroundColor: C.creamWarm, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
    tagText:       { fontFamily: F.mono, fontSize: 10, color: C.bronze, textTransform: 'capitalize' },

    progressCard:  { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 16 },
    progressTop:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontFamily: F.mono, fontSize: 10, color: C.mute },
    progressPct:   { fontFamily: F.mono, fontSize: 10, color: C.bronze },
    progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 2 },
    progressFill:  { height: 4, backgroundColor: C.bronze, borderRadius: 2 },

    actionRow:     { flexDirection: 'row', gap: 10, marginBottom: 24 },
    completeBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#5a7050', borderRadius: 14, paddingVertical: 13 },
    completeBtnText:{ fontSize: 11, fontWeight: '600', letterSpacing: 0.3, color: '#fff' },
    manageBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.bronzeLight, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 13 },
    manageBtnText: { fontSize: 11, fontWeight: '600', color: C.bronze, letterSpacing: 0.3 },
    manageBadge:   { backgroundColor: C.bronze, borderRadius: 999, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
    manageBadgeText:{ fontFamily: F.mono, fontSize: 9, color: '#fff', fontWeight: '700' },

    section:       { marginBottom: 28 },
    sectionLabel:  { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.mute, marginBottom: 14 },

    cocktailRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    cocktailThumb: { width: 44, height: 44, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    cocktailName:  { flex: 1, fontSize: 15, fontWeight: '500', color: C.ink },
    cocktailActions:{ flexDirection: 'row', alignItems: 'center', gap: 12 },
    cocktailMakeBtn:{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#e8ece0', alignItems: 'center', justifyContent: 'center' },
    cocktailDone:  { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e8ece0', alignItems: 'center', justifyContent: 'center' },

    emptyCtaCard:      { borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
    emptyCtaHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    emptyCtaIcon:      { width: 38, height: 38, borderRadius: 12, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    emptyCtaTitle:     { fontSize: 15, fontWeight: '700', color: C.ink },
    emptyCtaSub:       { fontSize: 12, color: C.mute, marginTop: 2, lineHeight: 16 },
    emptyCtaButton:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: C.bronze },
    emptyCtaButtonText:{ fontSize: 11, color: '#f5ece0', fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },

    addCocktailBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: C.bronzeLight, borderStyle: 'dashed' },
    addCocktailText: { fontSize: 13, color: C.bronze, fontWeight: '600' },

    completedCocktailRow: { opacity: 0.78,},
    completedBadge: { flexDirection: 'row', alignItems: 'center',gap: 4,backgroundColor: '#e8ece0',borderRadius: 999,paddingHorizontal: 10,paddingVertical: 5,},
    completedBadgeText: { fontSize: 10,fontWeight: '700',color: '#5a7050',textTransform: 'uppercase',letterSpacing: 0.5,},

    emptyText:     { fontSize: 13, color: C.mute, textAlign: 'center', paddingVertical: 16 },

    groceryRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
    groceryDot:    { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    groceryDotOk:  { backgroundColor: '#5a7050' },
    groceryDotMiss:{ backgroundColor: '#c0503a' },
    groceryInfo:   { flex: 1 },
    groceryName:   { fontSize: 14, fontWeight: '500', color: C.ink },
    groceryNeeded: { fontSize: 11, color: C.mute, marginTop: 2 },
    groceryBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    groceryBadgeOk:  { backgroundColor: '#e8ece0' },
    groceryBadgeMiss:{ backgroundColor: '#f4dfd4' },
    groceryBadgeText:{ fontSize: 10, fontWeight: '700' },
    groceryTextOk:   { color: '#5a7050' },
    groceryTextMiss: { color: '#a8472a' },
})

const m = StyleSheet.create({
    root:        { flex: 1, backgroundColor: C.cream },

    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
    headerCenter:{ alignItems: 'center', flex: 1 },
    eyebrow:     { fontSize: 8, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: C.bronze, marginBottom: 2 },
    title:       { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, fontWeight: '400', color: C.ink },
    cancelBtn:   { width: 64 },
    cancelText:  { fontSize: 14, color: C.mute, fontWeight: '500' },

    divider:     { height: 1, backgroundColor: C.border },

    searchOuter: { paddingHorizontal: 16, paddingVertical: 8 },
    searchWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 0, minHeight: 38, borderWidth: 1, borderColor: C.border, gap: 8 },
    searchInput: { flex: 1, height: 36, paddingVertical: 0, fontSize: 14, color: C.ink },

    list:        { paddingHorizontal: 16, paddingTop: 4 },
    hint:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
    hintText:    { fontSize: 14, color: C.mute },

    row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
    avatar:      { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    avatarText:  { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    info:        { flex: 1, minWidth: 0 },
    name:        { fontSize: 15, fontWeight: '500', color: C.ink },
    metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
    meta:        { fontSize: 11, color: C.mute, textTransform: 'capitalize' },
    addCircle:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.bronzeLight },
})