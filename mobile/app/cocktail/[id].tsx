import { useEffect, useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCocktail, useFavoriteIds, useToggleFavorite, useUserRating, useUpsertRating, useMakeNow, useDerivations } from '@/features/cocktails/hooks'
import { usePantryItems, useAddPantryItem } from '@/features/pantry/hooks'
import { RatingWidget } from '@/components/cocktail/RatingWidget'
import { AddIngredientsSheet } from '@/components/shared/AddIngredientsSheet'
import { PlanCocktailSheet } from '@/components/planner/PlanCocktailSheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { showGlobalNoticeDialog } from '@/components/ui/ActionDialog'
import { convertUnit, roundForServings } from '@/lib/unitConversion'
import { useProductTour } from '@/onboarding/ProductTour'
import { C, F, toneForId } from '@/theme/brand'
import type { DerivationMap } from '@/api/endpoints/derivations'
import {
    isBlockingCocktailIngredient,
    isNonBlockingCocktailIngredient,
    type CocktailIngredient,
    type UserPantryItemDTO,
} from '@mixoguide/shared'
import type { GroceryItem } from '@/api/endpoints/planner'
import { Ionicons } from '@expo/vector-icons'

type Tab = 'ingredients' | 'method' | 'notes'
type Unit = 'ml' | 'oz' | 'cl'

const UNITS: Unit[] = ['ml', 'oz', 'cl']

const DIFF_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Med', hard: 'Hard' }

type IngredientAvailabilityStatus = 'have' | 'derived' | 'substitute' | 'shopping' | 'missing' | 'nonblocking'

type IngredientAvailability = {
    status: IngredientAvailabilityStatus
    pantryItem?: UserPantryItemDTO
    substituteId?: string
    derivedFromId?: string
}

function findDerivedFromId(ingredientId: string, pantryIngredientIds: Set<string>, derivations: DerivationMap): string | null {
    for (const entry of derivations[ingredientId] ?? []) {
        if (pantryIngredientIds.has(entry.baseIngredientId)) return entry.baseIngredientId
    }
    return null
}

function getIngredientAvailability(
    ing: CocktailIngredient,
    pantryMap: Record<string, UserPantryItemDTO>,
    pantryIngredientIds: Set<string>,
    derivations: DerivationMap,
): IngredientAvailability {
    if (isNonBlockingCocktailIngredient(ing)) {
        return { status: 'nonblocking' }
    }

    const directItem = pantryMap[ing.ingredientId]
    if (directItem?.isInPantry) {
        return { status: 'have', pantryItem: directItem }
    }

    const derivedFromId = findDerivedFromId(ing.ingredientId, pantryIngredientIds, derivations)
    if (derivedFromId) {
        return { status: 'derived', pantryItem: pantryMap[derivedFromId], derivedFromId }
    }

    for (const substituteId of ing.substitutes ?? []) {
        const substituteItem = pantryMap[substituteId]
        if (substituteItem?.isInPantry) {
            return { status: 'substitute', pantryItem: substituteItem, substituteId }
        }

        const substituteDerivedFromId = findDerivedFromId(substituteId, pantryIngredientIds, derivations)
        if (substituteDerivedFromId) {
            return {
                status: 'substitute',
                pantryItem: pantryMap[substituteDerivedFromId],
                substituteId,
                derivedFromId: substituteDerivedFromId,
            }
        }
    }

    if (directItem?.isInShoppingList) {
        return { status: 'shopping', pantryItem: directItem }
    }

    return { status: 'missing' }
}

function isSatisfiedAvailability(availability: IngredientAvailability | undefined): boolean {
    return availability?.status === 'have'
        || availability?.status === 'derived'
        || availability?.status === 'substitute'
}

export default function CocktailDetailScreen() {
    const { id }   = useLocalSearchParams<{ id: string }>()
    const insets   = useSafeAreaInsets()
    const [tab, setTab]             = useState<Tab>('ingredients')
    const [servings, setServings]             = useState(1)
    const [unit, setUnit]           = useState<Unit>('oz')
    const [showMakeModal, setShowMakeModal]   = useState(false)
    const [showManageSheet, setShowManageSheet] = useState(false)
    const [showPlanSheet, setShowPlanSheet]   = useState(false)
    const tour                                = useProductTour()

    const { data: cocktail, isLoading } = useCocktail(id)
    const { data: favoriteIds = [] }    = useFavoriteIds()
    const toggleFav                     = useToggleFavorite()
    const { data: myRating }            = useUserRating(id)
    const upsertRating                  = useUpsertRating()
    const makeNow                       = useMakeNow()
    const { data: pantryItems = [] }    = usePantryItems()
    const { data: derivations = {} as DerivationMap } = useDerivations()
    const addPantryItem                 = useAddPantryItem()

    const isFav = favoriteIds.includes(id)

    const pantryMap = useMemo(() => {
        const map: Record<string, UserPantryItemDTO> = {}
        for (const item of pantryItems) {
            map[item.ingredientId] = item
        }
        return map
    }, [pantryItems])

    useEffect(() => {
        if (tour.isStep('stock') && tour.matchesCocktail(id)) {
            setTab('ingredients')
        }
    }, [id, tour])

    useEffect(() => {
        if (isFav && tour.isStep('favorite') && tour.matchesCocktail(id)) {
            tour.advanceFavorite(id)
        }
    }, [id, isFav, tour])

    function handleFav() {
        toggleFav.mutate(
            { cocktailId: id, isFav },
            {
                onSuccess: () => {
                    if (!isFav && tour.isStep('favorite') && tour.matchesCocktail(id)) {
                        tour.advanceFavorite(id)
                    }
                },
                onError: () => showGlobalNoticeDialog({ title: 'Favorite failed', message: 'Could not update favorites. Try again.', tone: 'danger', icon: 'close-circle-outline' }),
            }
        )
    }
    function handleRating(rating: number) { upsertRating.mutate({ cocktailId: id, rating }) }

    function confirmMake() {
        makeNow.mutate(
            { cocktailId: id, quantity: servings },
            {
                onSuccess: () => {
                    setShowMakeModal(false)
                    showGlobalNoticeDialog({ title: 'Done!', message: `${cocktail?.name} logged. Pantry updated.`, tone: 'success', icon: 'checkmark-circle-outline' })
                },
                onError: () => showGlobalNoticeDialog({ title: 'Error', message: 'Could not log cocktail. Try again.', tone: 'danger', icon: 'close-circle-outline' }),
            }
        )
    }

    if (isLoading || !cocktail) {
        return (
            <View style={[s.root, { paddingTop: 0 }]}>
                <TouchableOpacity
                    style={[s.circleBtn, { top: insets.top + 10, left: 14 }]}
                    onPress={() => router.back()}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={20} color={C.ink} />
                </TouchableOpacity>
                <Skeleton height={320} borderRadius={0} />
                <View style={{ padding: 20, gap: 14 }}>
                    <Skeleton height={28} width="65%" />
                    <Skeleton height={14} width="42%" />
                    <Skeleton height={14} width="55%" />
                </View>
            </View>
        )
    }

    const ingredients         = cocktail.ingredients ?? []
    const requiredIngredients = ingredients.filter(isBlockingCocktailIngredient)
    const barTools            = cocktail.barTools    ?? []
    const techniques          = cocktail.technique   ?? []
    const steps               = cocktail.instructions       ?? []
    const heroBg              = toneForId(id)
    const pantryIngredientIds = new Set(
        Object.values(pantryMap)
            .filter(item => item.isInPantry)
            .map(item => item.ingredientId)
    )
    const availabilityByIngredientId = new Map(
        ingredients.map(ing => [
            ing.ingredientId,
            getIngredientAvailability(ing, pantryMap, pantryIngredientIds, derivations),
        ])
    )

    const haveCount    = requiredIngredients.filter(ing => isSatisfiedAvailability(availabilityByIngredientId.get(ing.ingredientId))).length
    const totalCount   = requiredIngredients.length

    const groceryItems: GroceryItem[] = requiredIngredients.map(ing => {
        const p = pantryMap[ing.ingredientId]
        const availability = availabilityByIngredientId.get(ing.ingredientId)
        const satisfied = isSatisfiedAvailability(availability)
        const needed  = (ing.amount ?? 0) * servings
        const inStock = satisfied
            ? needed
            : p?.isInPantry
                ? (p.quantity > 0 ? p.quantity : needed)
                : 0
        const missing = satisfied ? 0 : needed
        return {
            ingredientId:   ing.ingredientId,
            ingredientName: ing.ingredient?.name ?? '—',
            totalNeeded:    needed,
            unit:           ing.unit ?? '',
            inPantry:       inStock,
            missing,
            inWishlist:     p?.isInShoppingList ?? false,
        }
    })
    const tags = [...(cocktail.flavors ?? []), ...(cocktail.occasions ?? [])]
    const favoriteTourTarget = tour.isStep('favorite') && tour.matchesCocktail(id)
    const planTourTarget = tour.isStep('plan') && tour.matchesCocktail(id)
    const stockTourTarget = tour.isStep('stock') && tour.matchesCocktail(id)

    return (
        <>
            <View style={s.root}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}
                >
                    {/* Hero */}
                    <View style={[s.hero, { backgroundColor: heroBg }]}>
                        {cocktail.imageUrl ? (
                            <Image
                                source={cocktail.imageUrl}
                                style={s.heroImg}
                                accessibilityRole="image"
                                accessibilityLabel={`${cocktail.name} image`}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={300}
                            />
                        ) : (
                            <>
                                <View style={s.heroSheen} />
                                <View style={s.heroGlyph}>
                                    <Ionicons name="wine-outline" size={120} color={C.ink} />
                                </View>
                            </>
                        )}
                        {/* Dark scrim at bottom so text overlay is readable */}
                        <View style={s.heroScrim} />

                        {/* Overlay buttons */}
                        <TouchableOpacity
                          style={[s.circleBtn, { top: insets.top + 10, left: 14 }]}
                          onPress={() => router.back()}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Go back"
                        >
                          <Ionicons name="arrow-back" size={20} color={C.ink} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.circleBtn, { top: insets.top + 10, right: 14 }, favoriteTourTarget && s.tourTargetCircle]}
                          onPress={handleFav}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={isFav ? `Remove ${cocktail.name} from favorites` : `Add ${cocktail.name} to favorites`}
                          accessibilityState={{ selected: isFav }}
                        >
                          <Ionicons
                            name={isFav ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isFav ? C.bronze : C.ink}
                          />
                        </TouchableOpacity>

                        {/* Name overlay at bottom of hero */}
                        <View style={s.heroNameWrap}>
                            <Text style={s.heroName} numberOfLines={2}>{cocktail.name}</Text>
                        </View>
                    </View>

                    {/* 4-col meta strip */}
                    <View style={s.metaStrip}>
                        <MetaCell top={cocktail.preparationTime ? `${cocktail.preparationTime}` : '—'} bot="min" />
                        <View style={s.metaDivider} />
                        <MetaCell top={DIFF_LABEL[cocktail.difficulty] ?? '—'} bot="level" />
                        <View style={s.metaDivider} />
                        <MetaCell top={cocktail.avgRating ? cocktail.avgRating.toFixed(1) : '—'} bot="rating" star />
                        <View style={s.metaDivider} />
                        <MetaCell top={cocktail.glass?.name ?? '—'} bot="glass" compact />
                    </View>

                    {/* Body */}
                    <View style={s.body}>
                        {cocktail.description ? (
                            <Text style={s.description}>{cocktail.description}</Text>
                        ) : null}

                        {/* Tab bar */}
                        <View style={s.tabBar}>
                            {(['ingredients', 'method', 'notes'] as Tab[]).map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[s.tabBtn, tab === t && s.tabBtnActive]}
                                    onPress={() => setTab(t)}
                                >
                                    <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
                                        {t === 'ingredients'
                                            ? `Ingredients${totalCount > 0 ? ` (${totalCount})` : ''}`
                                            : t.charAt(0).toUpperCase() + t.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* ── Ingredients tab ── */}
                        {tab === 'ingredients' && (
                            <View style={s.tabContent}>
                                {/* Servings scaler */}
                                <View style={s.servingsRow}>
                                    <Text style={s.servingsLabel}>Servings</Text>
                                    <View style={s.controlsRow}>
                                        <UnitPicker unit={unit} setUnit={setUnit} />
                                        <View style={s.servingsCtrl}>
                                            <TouchableOpacity
                                                style={s.servingsBtn}
                                                onPress={() => setServings(v => Math.max(1, v - 1))}
                                                hitSlop={8}
                                                disabled={servings <= 1}
                                                accessibilityRole="button"
                                                accessibilityLabel="Decrease servings"
                                            >
                                                <Ionicons name="remove" size={14} color={servings <= 1 ? C.border : C.ink} />
                                            </TouchableOpacity>
                                            <Text style={s.servingsVal}>{servings}</Text>
                                            <TouchableOpacity
                                                style={s.servingsBtn}
                                                onPress={() => setServings(v => Math.min(24, v + 1))}
                                                hitSlop={8}
                                                disabled={servings >= 24}
                                                accessibilityRole="button"
                                                accessibilityLabel="Increase servings"
                                            >
                                                <Ionicons name="add" size={14} color={servings >= 24 ? C.border : C.ink} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                {/* Readiness banner */}
                                {totalCount > 0 && (
                                    <View style={[s.readinessBanner, haveCount === totalCount ? s.readinessGreen : haveCount > 0 ? s.readinessAmber : s.readinessRed]}>
                                        <Text style={s.readinessLabel}>
                                            {haveCount === totalCount
                                                ? 'Ready to mix'
                                                : `${totalCount - haveCount} ingredient${totalCount - haveCount === 1 ? '' : 's'} missing`}
                                        </Text>
                                        <Text style={s.readinessCount}>{haveCount} / {totalCount}</Text>
                                    </View>
                                )}

                                {haveCount < totalCount && (
                                    <TouchableOpacity
                                        style={[s.manageBtn, stockTourTarget && s.tourTargetButton]}
                                        onPress={() => setShowManageSheet(true)}
                                    >
                                        <Ionicons name="cart-outline" size={15} color={C.bronze} />
                                        <Text style={s.manageBtnText}>Manage ingredients</Text>
                                    </TouchableOpacity>
                                )}

                                {ingredients.map((ing, i) => (
                                    <IngredientRow
                                        key={ing.ingredientId}
                                        ing={ing}
                                        servings={servings}
                                        unit={unit}
                                        availability={availabilityByIngredientId.get(ing.ingredientId)}
                                        isLast={i === ingredients.length - 1}
                                        onQuickAdd={() =>
                                            addPantryItem.mutate({
                                                ingredientId:    ing.ingredientId,
                                                isInShoppingList: true,
                                                shoppingQuantity: ing.amount ?? 1,
                                                unitLeft:         ing.unit ?? '',
                                            })
                                        }
                                    />
                                ))}

                                {techniques.length > 0 && (
                                    <>
                                        <Text style={[s.subLabel, { marginTop: 20 }]}>Techniques</Text>
                                        <View style={s.pillRow}>
                                            {techniques.map((technique, i) => (
                                                <View key={i} style={s.pill}>
                                                    <Text style={s.pillText}>{formatMetaLabel(technique)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                )}

                                {barTools.length > 0 && (
                                    <>
                                        <Text style={[s.subLabel, { marginTop: techniques.length > 0 ? 16 : 20 }]}>Bar tools</Text>
                                        <View style={s.pillRow}>
                                            {barTools.map((tool, i) => (
                                                <View key={i} style={s.pill}>
                                                    <Text style={s.pillText}>{tool.barTool?.name ?? 'Tool'}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                )}
                            </View>
                        )}

                        {/* ── Method tab ── */}
                        {tab === 'method' && (
                            <View style={s.tabContent}>
                                {steps.length === 0 ? (
                                    <Text style={s.emptyTab}>No instructions available.</Text>
                                ) : steps.map((step, i) => (
                                    <StepRow
                                        key={i}
                                        index={i}
                                        text={step}
                                        isLast={i === steps.length - 1}
                                    />
                                ))}
                            </View>
                        )}

                        {/* ── Notes tab ── */}
                        {tab === 'notes' && (
                            <View style={s.tabContent}>
                                <Text style={s.subLabel}>Profile</Text>
                                <View style={s.pillRow}>
                                    <View style={s.pill}>
                                        <Text style={s.pillText}>
                                            {cocktail.isAlcoholic === false ? 'Alcohol-free' : 'Contains alcohol'}
                                        </Text>
                                    </View>
                                </View>

                                {tags.length > 0 ? (
                                    <>
                                        <Text style={[s.subLabel, { marginTop: 18 }]}>Tags</Text>
                                        <View style={s.pillRow}>
                                            {tags.map((tag: string, i: number) => (
                                                <View key={i} style={s.tagPill}>
                                                    <Text style={s.tagText}>{tag.replace(/_/g, ' ')}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                ) : (
                                    <Text style={s.emptyTab}>No notes available.</Text>
                                )}
                            </View>
                        )}
                    <View style={s.ratingCard}>
                        <View style={s.ratingHeader}>
                            <View>
                                <Text style={s.ratingLabel}>Your rating</Text>
                                <Text style={s.ratingMeta}>
                                    {cocktail.avgRating
                                        ? `${cocktail.avgRating.toFixed(1)} average`
                                        : 'No ratings yet'}
                                    {cocktail.ratingCount > 0
                                        ? ` · ${cocktail.ratingCount} rating${cocktail.ratingCount === 1 ? '' : 's'}`
                                        : ''}
                                </Text>
                            </View>
                            {upsertRating.isPending ? (
                                <Text style={s.ratingSaving}>Saving</Text>
                            ) : myRating ? (
                                <Text style={s.ratingMine}>{myRating}/5</Text>
                            ) : null}
                        </View>
                        <RatingWidget
                            value={myRating ?? null}
                            onChange={handleRating}
                            disabled={upsertRating.isPending}
                            size={30}
                        />
                    </View>
                </View>
                </ScrollView>

                {/* Floating CTA bar */}
                <View style={[s.ctaBar, { paddingBottom: insets.bottom + 10 }]}>
                    <TouchableOpacity style={s.ctaPrimary} onPress={() => setShowMakeModal(true)}>
                        <Text style={s.ctaPrimaryText}>Mark as made</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.ctaSecondary, planTourTarget && s.tourTargetButton]} onPress={() => setShowPlanSheet(true)}>
                        <Ionicons name="add" size={15} color={C.ink} />
                        <Text style={s.ctaSecondaryText}>Plan</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <AddIngredientsSheet
                visible={showManageSheet}
                onClose={() => setShowManageSheet(false)}
                items={groceryItems}
                submitUrl={`/api/cocktails/${id}/add-ingredients`}
                defaultDestination={stockTourTarget ? 'pantry' : 'shopping'}
                onSuccess={() => {
                    if (stockTourTarget) tour.advanceStocked()
                }}
            />

            <PlanCocktailSheet
                visible={showPlanSheet}
                onClose={() => setShowPlanSheet(false)}
                preselectedCocktail={cocktail}
                onSuccess={(planned, plannedServings) => {
                    if (planTourTarget) tour.advancePlanned(cocktail, planned.id, plannedServings)
                }}
            />

            {/* Make Now modal */}
            <Modal visible={showMakeModal} transparent animationType="fade" onRequestClose={() => setShowMakeModal(false)}>
                <Pressable style={s.overlay} onPress={() => setShowMakeModal(false)}>
                    <Pressable style={s.makeModal} onPress={e => e.stopPropagation()}>
                        <Text style={s.makeModalTitle}>Mark as made</Text>
                        <View style={s.qtyRow}>
                            <TouchableOpacity
                                style={s.qtyBtn}
                                onPress={() => setServings(q => Math.max(1, q - 1))}
                                accessibilityRole="button"
                                accessibilityLabel="Decrease servings"
                            >
                                <Ionicons name="remove" size={22} color={C.ink} />
                            </TouchableOpacity>
                            <View style={s.qtyValueWrap}>
                                <Text style={s.qtyValue}>{servings}</Text>
                                <Text style={s.qtyUnit}>serving{servings !== 1 ? 's' : ''}</Text>
                            </View>
                            <TouchableOpacity
                                style={s.qtyBtn}
                                onPress={() => setServings(q => Math.min(24, q + 1))}
                                accessibilityRole="button"
                                accessibilityLabel="Increase servings"
                            >
                                <Ionicons name="add" size={22} color={C.ink} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={[s.confirmBtn, makeNow.isPending && { opacity: 0.6 }]}
                            onPress={confirmMake}
                            disabled={makeNow.isPending}
                        >
                            <Text style={s.confirmBtnText}>{makeNow.isPending ? 'Logging…' : 'Confirm'}</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    )
}

function MetaCell({ top, bot, star, compact }: { top: string; bot: string; star?: boolean; compact?: boolean }) {
    return (
        <View style={mc.cell}>
            {star && top !== '—' ? (
                <View style={mc.topRow}>
                    <Ionicons name="star" size={14} color={C.bronze} />
                    <Text style={mc.top}>{top}</Text>
                </View>
            ) : (
                <Text style={[mc.top, compact && mc.topCompact]} numberOfLines={compact ? 2 : 1}>
                    {top}
                </Text>
            )}
            <Text style={mc.bot}>{bot}</Text>
        </View>
    )
}

function formatMetaLabel(value: string) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase())
}

function fmtAmt(n: number) {
    return parseFloat(n.toFixed(2)).toString()
}

function UnitPicker({ unit, setUnit }: { unit: Unit; setUnit: (unit: Unit) => void }) {
    return (
        <View style={up.wrap}>
            {UNITS.map((u) => {
                const active = unit === u
                return (
                    <TouchableOpacity
                        key={u}
                        style={[up.btn, active && up.btnActive]}
                        onPress={() => setUnit(u)}
                        accessibilityRole="button"
                        accessibilityLabel={`Show ingredient amounts in ${u}`}
                        accessibilityState={{ selected: active }}
                    >
                        <Text style={[up.text, active && up.textActive]}>{u}</Text>
                    </TouchableOpacity>
                )
            })}
        </View>
    )
}

function IngredientRow({ ing, availability, isLast, servings, unit, onQuickAdd }: {
    ing: CocktailIngredient
    availability: IngredientAvailability | undefined
    isLast: boolean
    servings: number
    unit: Unit
    onQuickAdd?: () => void
}) {
    const status = availability?.status ?? 'missing'

    const neededUnit = ing.unit ?? 'pcs'
    let displayAmt: number | null = null
    let displayUnit = neededUnit

    if (ing.amount != null) {
        const scaledAmount = ing.amount * servings
        const scaledInSelectedUnit = convertUnit(scaledAmount, neededUnit, unit, {
            ingredientName: ing.ingredient?.name,
            typeName: ing.ingredient?.type?.name,
            subTypeName: ing.ingredient?.subType?.name,
            isAlcoholic: ing.ingredient?.isAlcoholic,
        })
        if (scaledInSelectedUnit != null) {
            displayAmt = roundForServings(scaledInSelectedUnit, unit)
            displayUnit = unit
        } else {
            displayAmt = roundForServings(scaledAmount, neededUnit)
            displayUnit = neededUnit
        }
    }

    const amtDisplay = displayAmt != null
        ? `${fmtAmt(displayAmt)}${displayUnit ? ' ' + displayUnit : ''}`
        : ing.optional ? 'opt.' : '—'
    const badgeLabel = status === 'shopping'
        ? 'List'
        : status === 'derived'
            ? 'Derived'
            : status === 'substitute'
                ? 'Sub'
                : status === 'nonblocking'
                    ? ing.amount == null ? 'Not required' : 'Garnish'
                    : 'Missing'

    return (
        <View style={[ir.row, !isLast && ir.rowBorder]}>
            <View style={[ir.dot,
                status === 'have'     && ir.dotHave,
                status === 'shopping' && ir.dotShopping,
                status === 'missing'  && ir.dotMissing,
                status === 'nonblocking' && ir.dotNonBlocking,
                status === 'derived' && ir.dotDerived,
                status === 'substitute' && ir.dotSubstitute,
            ]} />
            <Text style={ir.name}>{ing.ingredient?.name ?? '—'}</Text>
            <Text style={ir.qty}>{amtDisplay}</Text>
            {status !== 'have' && (
                <View style={[ir.badge,
                    status === 'shopping'
                        ? ir.badgeShopping
                        : status === 'nonblocking'
                            ? ir.badgeNonBlocking
                            : status === 'derived' || status === 'substitute'
                                ? ir.badgeSatisfiedAlt
                                : ir.badgeMissing,
                ]}>
                    <Text style={[ir.badgeText,
                        status === 'shopping'
                            ? ir.badgeTextShopping
                            : status === 'nonblocking'
                                ? ir.badgeTextNonBlocking
                                : status === 'derived' || status === 'substitute'
                                    ? ir.badgeTextSatisfiedAlt
                                    : ir.badgeTextMissing,
                    ]}>
                        {badgeLabel}
                    </Text>
                </View>
            )}
            {status !== 'have'
                && status !== 'derived'
                && status !== 'substitute'
                && status !== 'nonblocking'
                && onQuickAdd && (
                <TouchableOpacity
                    style={ir.plusBtn}
                    onPress={onQuickAdd}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${ing.ingredient?.name ?? 'ingredient'} to shopping list`}
                >
                    <Ionicons name="add" size={16} color={C.bronze} />
                </TouchableOpacity>
            )}
        </View>
    )
}

function StepRow({ index, text, isLast }: { index: number; text: string; isLast: boolean }) {
    return (
        <View style={[sr.row, !isLast && sr.rowBorder]}>
            <View style={sr.numWrap}>
                <Text style={sr.num}>{index + 1}</Text>
            </View>
            <Text style={sr.text}>{text}</Text>
        </View>
    )
}

const s = StyleSheet.create({
    root:          { flex: 1, backgroundColor: C.cream },

    hero:          { height: 320, position: 'relative', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    heroImg:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    heroSheen:     { position: 'absolute', top: -40, right: -20, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.18)' },
    heroGlyph:     { opacity: 0.18 },
    heroScrim:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(0,0,0,0.35)' },
    heroNameWrap:  { position: 'absolute', bottom: 18, left: 20, right: 80 },
    heroName:      { fontFamily: F.head, fontStyle: 'italic', fontSize: 30, fontWeight: '400', color: '#f5ece0', lineHeight: 34 },

    circleBtn:     { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(251,249,246,0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    circleBtnText: { fontSize: 18, color: C.ink },
    circleBtnFav:  { color: C.bronze },
    tourTargetCircle: {
        borderWidth: 2.5,
        borderColor: C.bronze,
        backgroundColor: 'rgba(245,236,224,0.96)',
        shadowColor: C.bronze,
        shadowOpacity: 0.5,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: 14,
    },

    metaStrip:     { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
    metaDivider:   { width: 1, backgroundColor: C.border, marginVertical: 14 },

    body:          { padding: 20 },
    description:   { fontSize: 14, color: C.mute, lineHeight: 20, marginBottom: 20 },

    ratingCard:    { backgroundColor: C.card, borderRadius: 16, marginTop: 20, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 20, gap: 12 },
    ratingHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    ratingLabel:   { fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: C.mute, marginBottom: 4 },
    ratingMeta:    { fontSize: 12, color: C.mute },
    ratingMine:    { fontFamily: F.mono, fontSize: 12, color: C.bronze, fontWeight: '700' },
    ratingSaving:  { fontSize: 10, color: C.mute, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },

    tabBar:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 20 },
    tabBtn:        { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabBtnActive:  { borderBottomWidth: 2, borderBottomColor: C.bronze },
    tabLabel:      { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: C.mute },
    tabLabelActive:{ color: C.bronze },

    tabContent:    {},
    subLabel:      { fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: C.mute, marginBottom: 12 },
    emptyTab:      { fontSize: 14, color: C.mute, textAlign: 'center', paddingVertical: 24 },
    pillRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    pill:          { backgroundColor: C.creamWarm, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
    pillText:      { fontSize: 12, color: C.ink },
    tagPill:       { backgroundColor: C.creamWarm, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
    tagText:       { fontFamily: F.mono, fontSize: 11, color: C.bronze, textTransform: 'capitalize' },

    manageBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.bronzeLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, alignSelf: 'flex-start' },
    manageBtnText:   { fontSize: 12, fontWeight: '600', color: C.bronze, letterSpacing: 0.3 },
    tourTargetButton: {
        borderColor: C.bronze,
        borderWidth: 2.5,
        backgroundColor: 'rgba(245,236,224,0.92)',
        shadowColor: C.bronze,
        shadowOpacity: 0.35,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
    },

    readinessBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
    readinessGreen:  { backgroundColor: '#e8ece0' },
    readinessAmber:  { backgroundColor: C.amber },
    readinessRed:    { backgroundColor: '#f4dfd4' },
    readinessLabel:  { fontSize: 13, fontWeight: '600', color: C.ink },
    readinessCount:  { fontFamily: F.head, fontStyle: 'italic', fontSize: 16, color: C.bronze },

    ctaBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10, backgroundColor: 'rgba(251,249,246,0.96)', borderTopWidth: 1, borderTopColor: C.border },
    ctaPrimary:    { position: 'relative', overflow: 'visible', flex: 1, backgroundColor: C.bronze, borderRadius: 13, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    ctaPrimaryText:{ fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: '#f5ece0' },
    ctaSecondary:  { position: 'relative', overflow: 'visible', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, borderRadius: 13, paddingVertical: 12, borderWidth: 1.5, borderColor: C.bronze, backgroundColor: C.card },
    ctaSecondaryText:{ fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: C.bronze },

    // Servings scaler
    servingsRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
    servingsLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: C.mute },
    controlsRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    servingsCtrl:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.creamWarm, borderRadius: 999, paddingHorizontal: 4, height: 32 },
    servingsBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    servingsVal:   { fontFamily: F.mono, fontSize: 14, color: C.ink, minWidth: 28, textAlign: 'center', fontWeight: '700' },

    overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
    makeModal:     { backgroundColor: C.card, borderRadius: 24, padding: 28, width: 300, alignItems: 'center', gap: 20 },
    makeModalTitle:{ fontFamily: F.head, fontStyle: 'italic', fontSize: 20, color: C.ink },
    qtyRow:        { flexDirection: 'row', alignItems: 'center', gap: 24 },
    qtyBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    qtyValueWrap:  { alignItems: 'center', minWidth: 56 },
    qtyValue:      { fontFamily: F.head, fontStyle: 'italic', fontSize: 32, color: C.bronze, lineHeight: 34 },
    qtyUnit:       { fontSize: 10, color: C.mute, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
    confirmBtn:    { backgroundColor: C.bronze, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 40 },
    confirmBtnText:{ fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#f5ece0' },
})

const mc = StyleSheet.create({
    cell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 12 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    top:  { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, color: C.bronze, lineHeight: 20, textAlign: 'center' },
    topCompact: {
        fontFamily: F.head,
        fontStyle: 'italic',
        fontSize: 14,
        lineHeight: 16,
        textTransform: 'none',
    },
    bot:  { fontSize: 9, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: C.mute, marginTop: 3 },
})

const up = StyleSheet.create({
    wrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.creamWarm, borderRadius: 999, padding: 3 },
    btn:       { minWidth: 34, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    btnActive: { backgroundColor: C.bronze },
    text:      { fontFamily: F.mono, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: C.mute },
    textActive:{ color: '#f5ece0' },
})

const ir = StyleSheet.create({
    row:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
    rowBorder:       { borderBottomWidth: 1, borderBottomColor: C.border },
    dot:             { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
    dotHave:         { backgroundColor: C.bronze },
    dotShopping:     { backgroundColor: C.bronzeLight },
    dotMissing:      { borderWidth: 1.5, borderColor: C.border, backgroundColor: 'transparent' },
    dotNonBlocking:  { backgroundColor: C.border },
    dotDerived:      { backgroundColor: '#6f8f68' },
    dotSubstitute:   { backgroundColor: '#a4884f' },
    name:            { flex: 1, fontSize: 15, color: C.ink },
    qty:             { fontFamily: F.mono, fontSize: 12, color: C.mute },
    badge:           { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    badgeShopping:   { backgroundColor: C.amber },
    badgeMissing:    { backgroundColor: '#f4dfd4' },
    badgeNonBlocking:{ backgroundColor: C.creamWarm },
    badgeSatisfiedAlt:{ backgroundColor: '#e8ece0' },
    badgeText:       { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    badgeTextShopping:{ color: C.bronze },
    badgeTextMissing: { color: '#a8472a' },
    badgeTextNonBlocking: { color: C.mute },
    badgeTextSatisfiedAlt: { color: '#5a7050' },
    plusBtn:          { width: 28, height: 28, borderRadius: 14, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.bronzeLight },
})

const sr = StyleSheet.create({
    row:    { flexDirection: 'row', gap: 14, paddingVertical: 14, alignItems: 'flex-start' },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    numWrap:{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
    num:    { fontFamily: F.mono, fontSize: 12, color: '#fff', fontWeight: '700' },
    text:   { flex: 1, fontSize: 15, color: C.ink, lineHeight: 22 },
})
