import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Pressable, type DimensionValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import {
    usePlannedCocktails, useDeletePlannedCocktail, useCompletePlannedCocktail,
    usePlannedCollections, useDeletePlannedCollection, useUpdatePlannedCocktail,
} from '@/features/planner/hooks'
import { useMakeableCocktails } from '@/features/cocktails/hooks'
import { PlanCocktailSheet } from '@/components/planner/PlanCocktailSheet'
import { CreateCollectionSheet, type CreateCollectionInitialValues } from '@/components/planner/CreateCollectionSheet'
import { SmartCollectionsRow } from '@/components/planner/SmartCollectionsRow'
import { DateSelector } from '@/components/planner/DateSelector'
import { Skeleton } from '@/components/ui/Skeleton'
import { SwipeableSheet } from '@/components/ui/SwipeableSheet'
import { showGlobalNoticeDialog, useActionDialog } from '@/components/ui/ActionDialog'
import { useFloatingTabBarLayout } from '@/components/navigation/FloatingTabBarLayoutContext'
import { useProductTour } from '@/onboarding/ProductTour'
import { C, F, toneForId } from '@/theme/brand'
import { isMakeableCocktailNow, type PlannedCocktailDTO, type PlannedCollectionDTO, type MakeableCocktail } from '@mixoguide/shared'

const DONE_PREVIEW_LIMIT = 10
const DAY_MS = 1000 * 60 * 60 * 24

function fmtShortDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function startOfDay(date: Date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function isOverdueDate(iso: string) {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return false
    return startOfDay(date).getTime() < startOfDay(new Date()).getTime()
}

function overdueText(iso: string) {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return 'Overdue'
    const days = Math.max(1, Math.round((startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / DAY_MS))
    return days === 1 ? '1 day late' : `${days} days late`
}

function defaultPlannerISO() {
    const d = new Date()
    d.setHours(19, 0, 0, 0)
    return d.toISOString()
}

function doneSortValue(item: PlannedCocktailDTO) {
    return new Date(item.completedAt ?? item.plannedFor).getTime()
}

export default function PlannerScreen() {
    const insets = useSafeAreaInsets()
    const [showPlanSheet, setShowPlanSheet]               = useState(false)
    const [showCreateSheet, setShowCreateSheet]           = useState(false)
    const [createInitialValues, setCreateInitialValues]   = useState<CreateCollectionInitialValues | undefined>()
    const [rescheduleTarget, setRescheduleTarget]         = useState<PlannedCocktailDTO | null>(null)
    const [showAllDone, setShowAllDone]                   = useState(false)
    const [selectedDoneIds, setSelectedDoneIds]           = useState<Set<string>>(() => new Set())
    const tour                                            = useProductTour()
    const { openActionDialog, actionDialog }              = useActionDialog()

    const openCreateSheet = useCallback((initial?: CreateCollectionInitialValues) => {
        setCreateInitialValues(initial)
        setShowCreateSheet(true)
    }, [])

    const closeCreateSheet = useCallback(() => {
        setShowCreateSheet(false)
        setCreateInitialValues(undefined)
    }, [])

    const handleCollectionCreated = useCallback((collection: PlannedCollectionDTO) => {
        if (collection.cocktails.length > 0) {
            router.push(`/planner/collection/${collection.id}`)
            return
        }
        router.push(`/planner/collection/${collection.id}?addCocktail=1`)
    }, [])

    const { data: plannedCocktails = [], isLoading: pcLoading } = usePlannedCocktails()
    const { data: collections = [], isLoading: colLoading }     = usePlannedCollections()
    const { data: makeableList = [] }                           = useMakeableCocktails()
    const deletePC   = useDeletePlannedCocktail()
    const completePC = useCompletePlannedCocktail()
    const updatePC   = useUpdatePlannedCocktail()
    const deleteCol  = useDeletePlannedCollection()
    const { controlBottom: tabControlBottom, getScrollPadding } = useFloatingTabBarLayout(insets.bottom)

    const makeableMap = useMemo(() => {
        const map: Record<string, MakeableCocktail> = {}
        for (const m of makeableList) map[m.id] = m
        return map
    }, [makeableList])

    const overdueCocktails = useMemo(
        () => plannedCocktails.filter(i => i.status === 'planned' && isOverdueDate(i.plannedFor)),
        [plannedCocktails]
    )
    const upcoming = useMemo(
        () => plannedCocktails.filter(i => i.status === 'planned' && !isOverdueDate(i.plannedFor)),
        [plannedCocktails]
    )
    const done = useMemo(
        () => plannedCocktails
            .filter(i => i.status === 'done')
            .slice()
            .sort((a, b) => doneSortValue(b) - doneSortValue(a)),
        [plannedCocktails]
    )
    const hasPlannerContent = plannedCocktails.length > 0 || collections.length > 0
    const overdueCollections = useMemo(
        () => collections.filter(c => c.status === 'planned' && isOverdueDate(c.plannedFor)),
        [collections]
    )
    const upcomingCollections = useMemo(
        () => collections.filter(c => c.status !== 'done' && !isOverdueDate(c.plannedFor)),
        [collections]
    )

    const featuredCol = upcomingCollections[0] ?? collections.find(c => c.status === 'done')
    const upNext      = upcoming.slice(0, 3)
    const visibleDone = showAllDone ? done : done.slice(0, DONE_PREVIEW_LIMIT)
    const overdueTotal = overdueCocktails.length + overdueCollections.length
    const selectionMode = selectedDoneIds.size > 0
    const scrollBottomPad = getScrollPadding(selectionMode ? 98 : 24)
    const allDoneSelected = done.length > 0 && done.every(pc => selectedDoneIds.has(pc.id))

    useEffect(() => {
        setSelectedDoneIds(prev => {
            const doneIds = new Set(done.map(pc => pc.id))
            const next = new Set(Array.from(prev).filter(id => doneIds.has(id)))
            return next.size === prev.size ? prev : next
        })
    }, [done])

    const toggleDoneSelection = useCallback((id: string) => {
        setSelectedDoneIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const selectDone = useCallback((id: string) => {
        setSelectedDoneIds(prev => {
            const next = new Set(prev)
            next.add(id)
            return next
        })
    }, [])

    const clearDoneSelection = useCallback(() => {
        setSelectedDoneIds(new Set())
    }, [])

    const selectAllDone = useCallback(() => {
        setShowAllDone(true)
        setSelectedDoneIds(new Set(done.map(pc => pc.id)))
    }, [done])

    const deleteSelectedDone = useCallback(() => {
        const ids = Array.from(selectedDoneIds)
        if (ids.length === 0) return

        openActionDialog({
            title:        'Delete selected cocktails?',
            message:      `Remove ${ids.length} completed cocktail${ids.length === 1 ? '' : 's'} from planner?`,
            confirmLabel: 'Delete',
            tone:         'danger',
            onConfirm:    () => {
                setSelectedDoneIds(new Set())
                void Promise.all(ids.map(id => deletePC.mutateAsync(id))).catch(() => {
                    showGlobalNoticeDialog({ title: 'Could not delete all items', message: 'Please try again.', tone: 'danger', icon: 'close-circle-outline' })
                })
            },
        })
    }, [deletePC, openActionDialog, selectedDoneIds])

    const completePlannedCocktail = useCallback((pc: PlannedCocktailDTO) => {
        openActionDialog({
            title:        'Mark as made?',
            message:      'This will decrement your pantry.',
            confirmLabel: 'Confirm',
            tone:         'success',
            icon:         'checkmark-circle-outline',
            onConfirm:    () => completePC.mutate(
                pc.id,
                {
                    onSuccess: () => {
                        if (tour.isStep('make') && tour.matchesPlannedCocktail(pc.id)) {
                            void tour.advanceMade(pc.id)
                        }
                    },
                    onError: () => showGlobalNoticeDialog({ title: 'Could not complete', message: 'Please try again.', tone: 'danger', icon: 'close-circle-outline' }),
                }
            ),
        })
    }, [completePC, openActionDialog, tour])

    const deleteCollection = useCallback((col: PlannedCollectionDTO) => {
        openActionDialog({
            title:        'Delete event',
            message:      `Delete "${col.title}"?`,
            confirmLabel: 'Delete',
            tone:         'danger',
            onConfirm:    () => deleteCol.mutate(col.id),
        })
    }, [deleteCol, openActionDialog])

    const removePlannedCocktail = useCallback((pc: PlannedCocktailDTO) => {
        openActionDialog({
            title:        'Remove cocktail',
            message:      `Remove "${pc.cocktail?.name ?? 'this cocktail'}" from planner?`,
            confirmLabel: 'Remove',
            tone:         'danger',
            icon:         'close-circle-outline',
            onConfirm:    () => deletePC.mutate(pc.id),
        })
    }, [deletePC, openActionDialog])

    const isLoading = pcLoading || colLoading

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[s.scroll, { paddingBottom: scrollBottomPad }]}
            >
                {/* Hero header */}
                <View style={s.heroHeader}>
                    <Text style={s.eyebrow}>The agenda</Text>
                    <View style={{ height: 8 }} />
                    <Text style={s.headline}>Planner</Text>
                    <View style={{ height: 4 }} />
                    <Text style={s.subLine}>
                        {!isLoading && overdueTotal > 0 ? `${overdueTotal} overdue - ` : ''}
                        {isLoading ? '…' : `${upcoming.length} upcoming · ${collections.length} events`}                {/* Overdue */}
                    </Text>
                </View>

                {overdueTotal > 0 && (
                    <View style={s.section}>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionEyebrow}>Overdue</Text>
                            <Text style={s.overdueCount}>{overdueTotal}</Text>
                        </View>
                        <View style={s.overdueStack}>
                            {overdueCollections.map(col => (
                                <CollectionCard
                                    key={col.id}
                                    collection={col}
                                    overdue
                                    onPress={() => router.push(`/planner/collection/${col.id}`)}
                                    onDelete={() => deleteCollection(col)}
                                />
                            ))}
                            {overdueCocktails.length > 0 && (
                                <View style={s.upNextCard}>
                                    {overdueCocktails.map((pc, i) => (
                                        <UpNextRow
                                            key={pc.id}
                                            pc={pc}
                                            isLast={i === overdueCocktails.length - 1}
                                            overdue
                                            makeableItem={makeableMap[pc.cocktailId]}
                                            tourTarget={tour.isStep('make') && tour.matchesPlannedCocktail(pc.id)}
                                            onPress={() => router.push(`/cocktail/${pc.cocktailId}`)}
                                            onReschedule={() => setRescheduleTarget(pc)}
                                            onComplete={() => completePlannedCocktail(pc)}
                                            onDelete={() => removePlannedCocktail(pc)}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Featured collection */}
                {isLoading ? (
                    <View style={s.section}>
                        <Skeleton height={160} borderRadius={20} />
                    </View>
                ) : featuredCol ? (
                    <View style={s.section}>
                        <Text style={s.sectionEyebrow}>Featured event</Text>
                        <FeaturedCard collection={featuredCol} onDelete={() => deleteCollection(featuredCol)} />
                    </View>
                ) : null}

                {/* Up next */}
                {upNext.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionEyebrow}>Up next</Text>
                        <View style={s.upNextCard}>
                            {upNext.map((pc, i) => (
                                <UpNextRow
                                    key={pc.id}
                                    pc={pc}
                                    isLast={i === upNext.length - 1}
                                    makeableItem={makeableMap[pc.cocktailId]}
                                    tourTarget={tour.isStep('make') && tour.matchesPlannedCocktail(pc.id)}
                                    onPress={() => router.push(`/cocktail/${pc.cocktailId}`)}
                                    onReschedule={() => setRescheduleTarget(pc)}
                                    onComplete={() => completePlannedCocktail(pc)}
                                    onDelete={() => removePlannedCocktail(pc)}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Collections list */}
                {collections.length > 0 && (
                    <View style={s.section}>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionEyebrow}>All events</Text>
                            <Text style={s.sectionCount}>{collections.length}</Text>
                        </View>
                        {collections.map(col => (
                            <CollectionCard
                                key={col.id}
                                collection={col}
                                overdue={col.status === 'planned' && isOverdueDate(col.plannedFor)}
                                onPress={() => router.push(`/planner/collection/${col.id}`)}
                                onDelete={() => deleteCollection(col)}
                            />
                        ))}
                    </View>
                )}

                {/* Done */}
                {done.length > 0 && (
                    <View style={s.section}>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionEyebrow}>Completed</Text>
                            <Text style={s.sectionCount}>{done.length}</Text>
                        </View>
                        <View style={s.upNextCard}>
                            {visibleDone.map((pc, i) => (
                                <UpNextRow
                                    key={pc.id}
                                    pc={pc}
                                    isLast={i === visibleDone.length - 1}
                                    done
                                    selected={selectedDoneIds.has(pc.id)}
                                    selectionMode={selectionMode}
                                    onPress={() => selectionMode ? toggleDoneSelection(pc.id) : router.push(`/cocktail/${pc.cocktailId}`)}
                                    onSelect={() => selectDone(pc.id)}
                                />
                            ))}
                        </View>
                        {done.length > DONE_PREVIEW_LIMIT && (
                            <TouchableOpacity
                                style={s.moreBtn}
                                onPress={() => setShowAllDone(v => !v)}
                                activeOpacity={0.75}
                            >
                                <Text style={s.moreBtnText}>
                                    {showAllDone ? 'Show less' : `Show ${done.length - DONE_PREVIEW_LIMIT} more`}
                                </Text>
                                <Ionicons name={showAllDone ? 'chevron-up' : 'chevron-down'} size={16} color={C.bronze} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Smart collections — always shown when there's at least one event */}
                {!isLoading && hasPlannerContent && (
                    <SmartCollectionsRow onOpenTheme={openCreateSheet} />
                )}

                {/* Empty state */}
                {!isLoading && plannedCocktails.length === 0 && collections.length === 0 && (
                    <EmptyPlannerState
                        onAddCocktail={() => setShowPlanSheet(true)}
                        onAddEventFromTemplate={openCreateSheet}
                    />
                )}
            </ScrollView>

            {selectionMode ? (
                <View style={[s.selectionBar, { bottom: tabControlBottom }]}>
                    <TouchableOpacity style={s.selectionIconBtn} onPress={clearDoneSelection} accessibilityRole="button" accessibilityLabel="Clear selection">
                        <Ionicons name="close" size={18} color={C.mute} />
                    </TouchableOpacity>
                    <Text style={s.selectionCount}>{selectedDoneIds.size} selected</Text>
                    <TouchableOpacity
                        style={[s.selectionBtn, allDoneSelected && s.selectionBtnDisabled]}
                        onPress={selectAllDone}
                        disabled={allDoneSelected}
                    >
                        <Text style={[s.selectionBtnText, allDoneSelected && s.selectionBtnTextDisabled]}>
                            {allDoneSelected ? 'All selected' : 'Select all'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.selectionDeleteBtn} onPress={deleteSelectedDone} disabled={deletePC.isPending}>
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                        <Text style={s.selectionDeleteText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={[s.fabGroup, { bottom: tabControlBottom }]}>
                    <TouchableOpacity style={s.fabSecondary} onPress={() => setShowPlanSheet(true)}>
                        <Ionicons name="add" size={14} color={C.bronze} />
                        <Text style={s.fabSecondaryText}>Cocktail</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.fab} onPress={() => openCreateSheet()}>
                        <Ionicons name="add" size={14} color="#f5ece0" />
                        <Text style={s.fabText}>Event</Text>
                    </TouchableOpacity>
                </View>
            )}

            <PlanCocktailSheet visible={showPlanSheet} onClose={() => setShowPlanSheet(false)} />
            <CreateCollectionSheet
                visible={showCreateSheet}
                onClose={closeCreateSheet}
                initialValues={createInitialValues}
                onCreated={handleCollectionCreated}
            />
            <RescheduleCocktailSheet
                cocktail={rescheduleTarget}
                pending={updatePC.isPending}
                onClose={() => setRescheduleTarget(null)}
                onConfirm={(plannedFor) => {
                    if (!rescheduleTarget) return
                    updatePC.mutate(
                        { id: rescheduleTarget.id, plannedFor },
                        {
                            onSuccess: () => setRescheduleTarget(null),
                            onError: () => showGlobalNoticeDialog({ title: 'Could not reschedule', message: 'Please try again.', tone: 'danger', icon: 'close-circle-outline' }),
                        }
                    )
                }}
            />
            {actionDialog}
        </View>
    )
}

function FeaturedCard({ collection, onDelete }: { collection: PlannedCollectionDTO; onDelete: () => void }) {
    const totalCocktails = collection.cocktails.length
    const isDone         = collection.status === 'done'
    const isOverdue      = collection.status === 'planned' && isOverdueDate(collection.plannedFor)
    const doneCocktails  = isDone
        ? totalCocktails
        : collection.cocktails.filter(c => (c as { status?: string }).status === 'done').length

    const progress       = totalCocktails > 0 ? doneCocktails / totalCocktails : 0
    const strips         = collection.cocktails.slice(0, 5)
    const progressWidth  = `${progress * 100}%` as DimensionValue
    const daysUntil      = daysUntilDate(collection.plannedFor)

    return (
        <Pressable
            style={({ pressed }) => [fc.card, pressed && { opacity: 0.92 }]}
            onPress={() => router.push(`/planner/collection/${collection.id}`)}
            onLongPress={onDelete}
        >
            {/* Dark banner */}
            <View style={fc.banner}>
                {/* Sheen */}
                <View style={fc.sheen} />

                {/* Tone strips */}
                <View style={fc.strips}>
                    {strips.map((c, i) => (
                        <View
                            key={i}
                            style={[
                                fc.strip,
                                { backgroundColor: toneForId(c.cocktailId ?? String(i)) },
                            ]}
                        />
                    ))}

                    {strips.length === 0
                        ? [0, 1, 2, 3, 4].map(i => (
                            <View
                                key={i}
                                style={[
                                    fc.strip,
                                    { backgroundColor: C.bronzeLight },
                                ]}
                            />
                        ))
                        : null}
                </View>

                {/* Date + title */}
                <View style={fc.bannerContent}>
                    <Text style={fc.bannerDate}>
                        {fmtShortDate(collection.plannedFor)}
                    </Text>

                    <Text style={fc.daysUntil}>
                        {daysUntilText(daysUntil)}
                    </Text>

                    <Text style={fc.bannerTitle} numberOfLines={2}>
                        {collection.title}
                    </Text>

                    {isOverdue && (
                        <View style={fc.overduePill}>
                            <Ionicons name="alert-circle" size={11} color="#a8472a" />
                            <Text style={fc.overduePillText}>
                                {overdueText(collection.plannedFor)}
                            </Text>
                        </View>
                    )}

                    {collection.occasions.length > 0 && (
                        <Text style={fc.bannerOccasion}>
                            {collection.occasions[0].replace(/_/g, ' ')}
                        </Text>
                    )}
                </View>
            </View>

            {/* Footer */}
            <View style={fc.footer}>
                <View style={{ flex: 1 }}>
                    <View style={fc.progressRow}>
                        <Text style={fc.progressLabel}>
                            {doneCocktails}/{totalCocktails} cocktails
                        </Text>
                        <Text style={fc.progressPct}>
                            {Math.round(progress * 100)}%
                        </Text>
                    </View>

                    <View style={fc.progressTrack}>
                        <View style={[fc.progressFill, { width: progressWidth }]} />
                    </View>
                </View>

                <Ionicons name="chevron-forward" size={22} color={C.mute} />
            </View>
        </Pressable>
    )
}

function daysUntilDate(date: string | Date) {
    const today = new Date()
    const target = new Date(date)

    today.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)

    return Math.ceil(
        (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
}

function daysUntilText(days: number) {
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days > 1) return `In ${days} days`
    if (days === -1) return 'Yesterday'

    return `${Math.abs(days)} days ago`
}

function CollectionCard({ collection, overdue, onPress, onDelete }: {
    collection: PlannedCollectionDTO
    overdue?: boolean
    onPress: () => void
    onDelete: () => void
}) {
    const total    = collection.cocktails.length
    const isDone   = collection.status === 'done'
    const done     = isDone ? total : collection.cocktails.filter(c => (c as { status?: string }).status === 'done').length
    const progress = total > 0 ? done / total : 0
    const progressWidth = `${progress * 100}%` as DimensionValue

    return (
        <Pressable
            style={({ pressed }) => [cc.card, overdue && cc.cardOverdue, pressed && { opacity: 0.9 }, isDone && cc.cardDone]}
            onPress={onPress}
            onLongPress={onDelete}
        >
            <View style={[cc.iconCircle, overdue && cc.iconCircleOverdue]}>
                <Ionicons name={overdue ? 'alert-circle' : 'calendar-outline'} size={18} color={overdue ? '#a8472a' : C.bronze} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[cc.title, isDone && cc.titleDone]} numberOfLines={1}>{collection.title}</Text>
                {overdue && (
                    <View style={cc.overduePill}>
                        <Text style={cc.overduePillText}>{overdueText(collection.plannedFor)}</Text>
                    </View>
                )}
                <Text style={cc.meta}>{fmtShortDate(collection.plannedFor)} · {total} cocktails · {collection.servings} servings</Text>
                {!isDone && (
                    <View style={cc.trackWrap}>
                        <View style={cc.track}>
                            <View style={[cc.fill, { width: progressWidth }]} />
                        </View>
                    </View>
                )}
            </View>
            {isDone ? (
                <View style={cc.donePill}><Text style={cc.donePillText}>Done</Text></View>
            ) : (
                <Ionicons name="chevron-forward" size={22} color={C.mute} />
            )}
        </Pressable>
    )
}

function UpNextRow({ pc, isLast, done, overdue, selected, selectionMode, makeableItem, tourTarget, onPress, onComplete, onDelete, onReschedule, onSelect }: {
    pc: PlannedCocktailDTO
    isLast: boolean
    done?: boolean
    overdue?: boolean
    selected?: boolean
    selectionMode?: boolean
    makeableItem?: MakeableCocktail
    tourTarget?: boolean
    onPress: () => void
    onComplete?: () => void
    onDelete?: () => void
    onReschedule?: () => void
    onSelect?: () => void
}) {
    const satisfiedCount = makeableItem ? makeableItem.requiredCount - makeableItem.missingCount : 0
    const makeableLabel = 'Ready'

    return (
        <Pressable
            style={({ pressed }) => [
                ur.row,
                !isLast && ur.rowBorder,
                overdue && ur.rowOverdue,
                selected && ur.rowSelected,
                pressed && { opacity: 0.85 },
            ]}
            onPress={onPress}
            onLongPress={done && onSelect ? onSelect : onDelete}
        >
            <View style={ur.dateCol}>
                <Text style={ur.dateTop}>{new Date(pc.plannedFor).toLocaleDateString('en-US', { month: 'short' })}</Text>
                <Text style={ur.dateDay}>{new Date(pc.plannedFor).getDate()}</Text>
            </View>
            <View style={[ur.thumb, { backgroundColor: toneForId(pc.cocktailId) }]}>
                {pc.cocktail?.imageUrl ? (
                    <Image
                        source={pc.cocktail.imageUrl}
                        style={StyleSheet.absoluteFillObject}
                        accessibilityRole="image"
                        accessibilityLabel={`${pc.cocktail.name} image`}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <Ionicons name="wine-outline" size={17} color="rgba(255,255,255,0.75)" />
                )}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[ur.name, done && ur.nameDone]} numberOfLines={1}>
                    {pc.cocktail?.name ?? '—'}
                </Text>
                <View style={ur.metaLine}>
                    {pc.quantity > 1 && <Text style={ur.qty}>{pc.quantity} servings</Text>}
                    {overdue && !done && (
                        <View style={ur.overduePill}>
                            <Text style={ur.overduePillText}>{overdueText(pc.plannedFor)}</Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={ur.actions}>
                {!done && makeableItem && (
                    isMakeableCocktailNow(makeableItem) ? (
                        <View style={ur.readyBadge}>
                            <Text style={ur.readyBadgeText}>{makeableLabel}</Text>
                        </View>
                    ) : (
                        <View style={ur.partialBadge}>
                            <Text style={ur.partialBadgeText}>{satisfiedCount}/{makeableItem.requiredCount}</Text>
                        </View>
                    )
                )}
                {!done && onReschedule ? (
                    <TouchableOpacity
                        style={ur.iconBtn}
                        onPress={onReschedule}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Reschedule ${pc.cocktail?.name ?? 'cocktail'}`}
                        accessibilityHint="Open date picker to move this cocktail to another day"
                    >
                        <Ionicons name="calendar-outline" size={18} color={C.bronze} />
                    </TouchableOpacity>
                ) : null}
                {done ? (
                    <View style={[ur.doneBadge, selectionMode && ur.selectBadge, selected && ur.selectedBadge]}>
                        <Ionicons
                            name={selectionMode ? (selected ? 'checkmark' : 'ellipse-outline') : 'checkmark'}
                            size={selectionMode && !selected ? 20 : 16}
                            color={selected ? '#fff' : C.bronze}
                        />
                    </View>
                ) : onComplete ? (
                    <TouchableOpacity
                        style={[ur.checkBtn, tourTarget && ur.tourTargetBtn]}
                        onPress={onComplete}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Mark ${pc.cocktail?.name ?? 'cocktail'} as done`}
                        accessibilityHint="Mark this cocktail as made and update pantry quantities"
                    >
                        <Ionicons name="checkmark-circle-outline" size={22} color={C.bronze} />
                    </TouchableOpacity>
                ) : null}
            </View>
        </Pressable>
    )
}

// ── Empty planner state ──────────────────────────────────────────────────────

function RescheduleCocktailSheet({ cocktail, pending, onClose, onConfirm }: {
    cocktail: PlannedCocktailDTO | null
    pending: boolean
    onClose: () => void
    onConfirm: (plannedFor: string) => void
}) {
    const [plannedFor, setPlannedFor] = useState(defaultPlannerISO)

    useEffect(() => {
        if (cocktail) setPlannedFor(cocktail.plannedFor)
    }, [cocktail?.id, cocktail?.plannedFor])

    return (
        <SwipeableSheet visible={!!cocktail} onClose={onClose}>
            <View style={rs.container}>
                <View style={rs.header}>
                    <TouchableOpacity style={rs.cancelBtn} onPress={onClose}>
                        <Text style={rs.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <View style={rs.headerCenter}>
                        <Text style={rs.eyebrow}>Reschedule</Text>
                        <Text style={rs.title} numberOfLines={1}>{cocktail?.cocktail?.name ?? 'Cocktail'}</Text>
                    </View>
                    <TouchableOpacity
                        style={[rs.saveBtn, (!cocktail || pending) && rs.saveBtnDisabled]}
                        onPress={() => onConfirm(plannedFor)}
                        disabled={!cocktail || pending}
                    >
                        <Text style={[rs.saveText, (!cocktail || pending) && rs.saveTextDisabled]}>
                            {pending ? 'Saving...' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={rs.divider} />
                <View style={rs.body}>
                    <Text style={rs.label}>New date</Text>
                    <DateSelector value={plannedFor} onChange={setPlannedFor} />
                </View>
            </View>
        </SwipeableSheet>
    )
}

function EmptyPlannerState({ onAddCocktail, onAddEventFromTemplate }: {
    onAddCocktail: () => void
    onAddEventFromTemplate: (config: CreateCollectionInitialValues) => void
}) {
    return (
        <View style={ep.wrap}>
            {/* Calendar illustration */}
            <View style={ep.calIllustration}>
                <View style={ep.calCard}>
                    <View style={ep.calHeader}>
                        <View style={ep.calDot} />
                        <View style={[ep.calDot, { marginLeft: 6 }]} />
                    </View>
                    <View style={ep.calBody}>
                        {[0, 1, 2].map(row => (
                            <View key={row} style={ep.calRow}>
                                {[0, 1, 2, 3, 4, 5, 6].map(col => (
                                    <View
                                        key={col}
                                        style={[ep.calCell, row === 1 && col === 3 && ep.calCellActive]}
                                    />
                                ))}
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            <View style={{ height: 28 }} />
            <Text style={ep.eyebrow}>Your agenda</Text>
            <View style={{ height: 10 }} />
            <Text style={ep.headline}>Nothing planned{'\n'}yet</Text>
            <View style={{ height: 12 }} />
            <Text style={ep.body}>Pick a smart collection or add your first cocktail to the agenda.</Text>

            <View style={{ height: 12 }} />

            {/* Smart collections — curated themes with cocktails already picked */}
            <View style={ep.smartWrap}>
                <SmartCollectionsRow title="Start with a theme" onOpenTheme={onAddEventFromTemplate} />
            </View>

            <View style={{ height: 12 }} />

            {/* CTA */}
            <TouchableOpacity style={ep.primaryBtn} onPress={onAddCocktail} activeOpacity={0.8}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={ep.primaryBtnText}>New plan</Text>
            </TouchableOpacity>
        </View>
    )
}

const rs = StyleSheet.create({
    container:       { flex: 1, backgroundColor: C.cream },
    header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
    headerCenter:    { alignItems: 'center', flex: 1 },
    eyebrow:         { fontSize: 8, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: C.bronze, marginBottom: 2 },
    title:           { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, fontWeight: '400', color: C.ink, maxWidth: 180 },
    cancelBtn:       { width: 76 },
    cancelText:      { fontSize: 13, color: C.mute, fontWeight: '500' },
    saveBtn:         { minWidth: 76, height: 38, borderRadius: 19, paddingHorizontal: 14, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center' },
    saveBtnDisabled: { backgroundColor: C.creamWarm },
    saveText:        { fontSize: 12, fontWeight: '800', color: '#f5ece0', letterSpacing: 0.8, textTransform: 'uppercase' },
    saveTextDisabled:{ color: C.mute },
    divider:         { height: 1, backgroundColor: C.border },
    body:            { paddingHorizontal: 16, paddingTop: 20 },
    label:           { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.mute, marginBottom: 10 },
})

const ep = StyleSheet.create({
    wrap:            { paddingHorizontal: 24, paddingTop: 32 },

    calIllustration: { alignItems: 'center' },
    calCard:         { width: 130, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    calHeader:       { backgroundColor: C.bronze, height: 32, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
    calDot:          { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.5)' },
    calBody:         { padding: 10, gap: 6 },
    calRow:          { flexDirection: 'row', gap: 4 },
    calCell:         { flex: 1, height: 10, borderRadius: 2, backgroundColor: C.borderWarm },
    calCellActive:   { backgroundColor: C.bronze },

    eyebrow:         { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    headline:        { fontFamily: F.head, fontStyle: 'italic', fontSize: 30, fontWeight: '400', color: C.ink, lineHeight: 36 },
    body:            { fontSize: 14, color: C.mute, lineHeight: 22 },

    smartWrap:       { marginHorizontal: -24 },

    primaryBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.bronze, borderRadius: 16, paddingVertical: 16 },
    primaryBtnText:  { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: '#fff' },
})

const s = StyleSheet.create({
    root:           { flex: 1, backgroundColor: C.cream },
    scroll:         { paddingBottom: 20 },

    heroHeader:     { backgroundColor: '#f0ebe3', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
    eyebrow:        { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    headline:       { fontFamily: F.head, fontStyle: 'italic', fontSize: 30, fontWeight: '400', color: C.ink, lineHeight: 32 },
    subLine:        { fontSize: 12, color: C.mute },

    section:        { paddingHorizontal: 16, marginTop: 20 },
    sectionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionEyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: C.bronze, marginBottom: 12 },
    sectionCount:   { fontFamily: F.mono, fontSize: 11, color: C.mute },
    overdueCount:   { fontFamily: F.mono, fontSize: 11, fontWeight: '700', color: '#a8472a' },

    upNextCard:     { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    overdueStack:   { gap: 10 },
    moreBtn:        { marginTop: 10, minHeight: 40, borderRadius: 14, borderWidth: 1, borderColor: C.bronzeLight, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    moreBtnText:    { fontSize: 12, fontWeight: '700', color: C.bronze },

    fabGroup:       { position: 'absolute', right: 16, flexDirection: 'row', gap: 8, alignItems: 'center' },
    fab:            { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.bronze, paddingHorizontal: 16, height: 44, borderRadius: 999, shadowColor: C.bronze, shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
    fabText:        { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: '#f5ece0' },
    fabSecondary:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.card, paddingHorizontal: 14, height: 44, borderRadius: 999, borderWidth: 1.5, borderColor: C.bronze, shadowColor: C.bronze, shadowOpacity: 0.1, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    fabSecondaryText:{ fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: C.bronze },
    selectionBar:   { position: 'absolute', left: 12, right: 12, minHeight: 58, borderRadius: 20, borderWidth: 1, borderColor: C.borderWarm, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, shadowColor: C.ink, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 8 },
    selectionIconBtn:{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: C.creamWarm },
    selectionCount: { flex: 1, fontFamily: F.mono, fontSize: 11, color: C.ink },
    selectionBtn:   { height: 36, borderRadius: 18, paddingHorizontal: 12, borderWidth: 1, borderColor: C.bronzeLight, alignItems: 'center', justifyContent: 'center' },
    selectionBtnDisabled:{ borderColor: C.border, backgroundColor: C.creamWarm },
    selectionBtnText:{ fontSize: 11, fontWeight: '700', color: C.bronze },
    selectionBtnTextDisabled:{ color: C.mute },
    selectionDeleteBtn:{ height: 36, borderRadius: 18, paddingHorizontal: 12, backgroundColor: '#a8472a', flexDirection: 'row', alignItems: 'center', gap: 5 },
    selectionDeleteText:{ fontSize: 11, fontWeight: '700', color: '#fff' },
})

const fc = StyleSheet.create({
    card:          { backgroundColor: C.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
    banner:        { height: 160, backgroundColor: C.heroDark, position: 'relative' },
    sheen:         { position: 'absolute', top: -30, right: -20, width: 160, height: 160, borderRadius: 80, backgroundColor: C.bronzeLight, opacity: 0.25 },
    strips:        { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', height: 6 },
    strip:         { flex: 1 },
    bannerContent: { position: 'absolute', bottom: 20, left: 18 },
    bannerDate:    { fontSize: 9, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
    bannerTitle:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 26, fontWeight: '400', color: '#f5ece0', lineHeight: 28 },
    bannerOccasion:{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, textTransform: 'capitalize' },
    overduePill:   { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f4dfd4', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginTop: 8 },
    overduePillText:{ fontSize: 10, fontWeight: '700', color: '#a8472a' },
    footer:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 14 },
    progressRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressLabel: { fontFamily: F.mono, fontSize: 10, color: C.mute },
    progressPct:   { fontFamily: F.mono, fontSize: 10, color: C.bronze },
    progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 2 },
    progressFill:  { height: 4, backgroundColor: C.bronze, borderRadius: 2 },
    daysUntil: { fontSize: 12, color: C.mute, marginTop: 2, marginBottom: 4, },
})

const cc = StyleSheet.create({
    card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, gap: 12 },
    cardOverdue:{ backgroundColor: '#fff7ed', borderColor: '#f0c7b6' },
    cardDone:  { opacity: 0.6 },
    iconCircle:{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    iconCircleOverdue:{ backgroundColor: '#f4dfd4' },
    title:     { fontFamily: F.head, fontStyle: 'italic', fontSize: 17, fontWeight: '400', color: C.ink, marginBottom: 2 },
    titleDone: { textDecorationLine: 'line-through', color: C.mute },
    meta:      { fontFamily: F.mono, fontSize: 10, color: C.mute, marginBottom: 6 },
    overduePill:{ alignSelf: 'flex-start', backgroundColor: '#f4dfd4', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 5 },
    overduePillText:{ fontSize: 10, fontWeight: '700', color: '#a8472a' },
    trackWrap: { marginTop: 2 },
    track:     { height: 3, backgroundColor: C.border, borderRadius: 2 },
    fill:      { height: 3, backgroundColor: C.bronze, borderRadius: 2 },
    donePill:  { backgroundColor: C.creamWarm, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    donePillText:{ fontFamily: F.mono, fontSize: 10, color: C.bronze },
})

const ur = StyleSheet.create({
    row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
    rowBorder:  { borderBottomWidth: 1, borderBottomColor: C.border },
    rowOverdue: { backgroundColor: '#fff7ed' },
    rowSelected:{ backgroundColor: '#f5ece0' },
    dateCol:    { width: 36, alignItems: 'center' },
    dateTop:    { fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: C.mute },
    dateDay:    { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, color: C.bronze, lineHeight: 24 },
    thumb:      { width: 40, height: 40, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    name:       { fontSize: 15, fontWeight: '600', color: C.ink },
    nameDone:   { textDecorationLine: 'line-through', color: C.mute },
    metaLine:   { minHeight: 18, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 },
    qty:        { fontSize: 11, color: C.mute },
    overduePill:{ backgroundColor: '#f4dfd4', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    overduePillText:{ fontSize: 10, fontWeight: '700', color: '#a8472a' },
    actions:    { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
    iconBtn:    { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
    checkBtn:   { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.bronzeLight, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    tourTargetBtn:{
        borderColor: C.bronze,
        borderWidth: 2.5,
        backgroundColor: 'rgba(245,236,224,0.95)',
        shadowColor: C.bronze,
        shadowOpacity: 0.42,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: 12,
    },
    doneBadge:  { width: 36, height: 36, borderRadius: 18, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    selectBadge:     { borderWidth: 1, borderColor: C.bronzeLight, backgroundColor: C.card },
    selectedBadge:   { backgroundColor: C.bronze, borderColor: C.bronze },
    readyBadge:      { backgroundColor: '#e8ece0', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    readyBadgeText:  { fontSize: 10, fontWeight: '700', color: '#6a7a5a', letterSpacing: 0.5 },
    partialBadge:    { backgroundColor: C.amber, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    partialBadgeText:{ fontFamily: F.mono, fontSize: 10, color: C.bronze },
})
