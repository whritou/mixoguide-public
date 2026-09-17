import { useState, useMemo, useEffect } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useIngredient } from '@/features/ingredients/hooks'
import { usePantryItems, useAddPantryItem, useUpdatePantryItem } from '@/features/pantry/hooks'
import { Skeleton } from '@/components/ui/Skeleton'
import { useActionDialog } from '@/components/ui/ActionDialog'
import { defaultQuantityText, isDefaultQuantityText } from '@/lib/unitDefaults'
import { C, F, toneForId } from '@/theme/brand'
import type { UserPantryItemDTO } from '@mixoguide/shared'

const UNITS = ['cl', 'ml', 'oz', 'g', 'pcs'] as const
type Unit = typeof UNITS[number]

function normalizeUnit(value?: string | null): Unit {
    return value && ([...UNITS] as string[]).includes(value) ? value as Unit : 'cl'
}

function parseQuantity(value: string): number {
    return parseFloat(value.replace(',', '.')) || 0
}

function cocktailUsageText(count?: number): string | null {
    if (!count || count <= 0) return null
    return `Used in ${count} cocktail${count === 1 ? '' : 's'}`
}

export default function IngredientDetailScreen() {
    const { id }   = useLocalSearchParams<{ id: string }>()
    const insets   = useSafeAreaInsets()
    const [expanded, setExpanded]       = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const { openActionDialog, actionDialog } = useActionDialog()

    const { data: ingredient, isLoading, isError } = useIngredient(id)
    const { data: pantryItems = [] } = usePantryItems()
    const addPantryItem    = useAddPantryItem()
    const updatePantryItem = useUpdatePantryItem()

    const pantryItem: UserPantryItemDTO | undefined = useMemo(
        () => pantryItems.find(p => p.ingredientId === id),
        [pantryItems, id]
    )

    const inPantry   = pantryItem?.isInPantry ?? false
    const inShopping = pantryItem?.isInShoppingList ?? false
    const heroBg     = toneForId(id)

    function smartSlice(text: string, max = 280): string {
        if (text.length <= max) return text
        const slice  = text.slice(0, max)
        const lastDot = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'))
        return lastDot > 0 ? slice.slice(0, lastDot + 1) : slice.slice(0, slice.lastIndexOf(' ')) + '…'
    }

    if (isLoading) {
        return (
            <View style={[s.root]}>
                <TouchableOpacity
                    style={[s.circleBtn, { top: insets.top + 10, left: 14 }]}
                    onPress={() => router.back()}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={20} color={C.ink} />
                </TouchableOpacity>
                <Skeleton height={300} borderRadius={0} />
                <View style={{ padding: 20, gap: 14 }}>
                    <Skeleton height={28} width="55%" borderRadius={6} />
                    <Skeleton height={14} width="40%" borderRadius={4} />
                    <Skeleton height={14} width="70%" borderRadius={4} />
                    <Skeleton height={14} width="60%" borderRadius={4} />
                </View>
            </View>
        )
    }

    if (isError || !ingredient) {
        return (
            <View style={[s.root, s.center, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={[s.circleBtn, { top: insets.top + 10, left: 14 }]}
                    onPress={() => router.back()}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={20} color={C.ink} />
                </TouchableOpacity>
                <Text style={s.errorText}>Ingredient not found</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={s.errorBack}>Go back</Text>
                </TouchableOpacity>
            </View>
        )
    }

    const desc = ingredient.description ?? ''
    const usageText = cocktailUsageText(ingredient._count?.cocktailIngredients)

    return (
        <>
            <View style={s.root}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}
                >
                    {/* Hero */}
                    <View style={[s.hero, { backgroundColor: heroBg }]}>
                        {ingredient.imageUrl ? (
                            <Image
                                source={ingredient.imageUrl}
                                style={s.heroImg}
                                accessibilityRole="image"
                                accessibilityLabel={`${ingredient.name} image`}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                transition={300}
                            />
                        ) : (
                            <>
                                <View style={s.heroSheen} />
                                <Text style={s.heroGlyph}>◈</Text>
                            </>
                        )}
                        <View style={s.heroScrim} />

                        {/* Back button */}
                        <TouchableOpacity
                            style={[s.circleBtn, { top: insets.top + 10, left: 14 }]}
                            onPress={() => router.back()}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                        >
                            <Ionicons name="arrow-back" size={20} color={C.ink} />
                        </TouchableOpacity>

                        {/* Name at bottom of hero */}
                        <View style={s.heroNameWrap}>
                            <Text style={s.heroName} numberOfLines={2}>{ingredient.name}</Text>
                        </View>
                    </View>

                    {/* Badges strip */}
                    <View style={s.badgeStrip}>
                        {ingredient.type?.name && (
                            <View style={s.badge}>
                                <Text style={s.badgeText}>
                                    {ingredient.type.name}
                                    {ingredient.subType?.name ? ` · ${ingredient.subType.name}` : ''}
                                </Text>
                            </View>
                        )}
                        {ingredient.brand && (
                            <View style={s.badge}>
                                <Text style={s.badgeText}>{ingredient.brand}</Text>
                            </View>
                        )}
                        {ingredient.abv != 0 && (
                            <View style={s.badge}>
                                <Text style={s.badgeText}>{ingredient.abv}% ABV</Text>
                            </View>
                        )}
                        {ingredient.isAlcoholic != null && (
                            <View style={[s.badge, ingredient.isAlcoholic ? s.badgeAlc : s.badgeNonAlc]}>
                                <Text style={[s.badgeText, ingredient.isAlcoholic ? s.badgeAlcText : s.badgeNonAlcText]}>
                                    {ingredient.isAlcoholic ? 'Alcoholic' : 'Non-alcoholic'}
                                </Text>
                            </View>
                        )}
                        {usageText && (
                            <View style={s.badge}>
                                <Ionicons name="wine-outline" size={12} color={C.bronze} />
                                <Text style={s.badgeText}>{usageText}</Text>
                            </View>
                        )}
                    </View>

                    <View style={s.body}>
                        {/* Description */}
                        {desc.length > 0 && (
                            <View style={s.descSection}>
                                <Text style={s.desc}>
                                    {expanded ? desc : smartSlice(desc)}
                                </Text>
                                {desc.length > 280 && (
                                    <TouchableOpacity onPress={() => setExpanded(e => !e)} style={{ marginTop: 8 }}>
                                        <Text style={s.readMore}>{expanded ? 'Show less' : 'Read more'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Pantry status */}
                        <View style={s.pantryCard}>
                            <Text style={s.pantryLabel}>Pantry status</Text>
                            {inPantry ? (
                                <View style={s.pantryRow}>
                                    <View style={s.stockDot} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.pantryHaveText}>In your pantry</Text>
                                        {pantryItem && (
                                            <Text style={s.pantryQty}>
                                                {pantryItem.quantity > 0
                                                    ? `${pantryItem.quantity} ${pantryItem.unitLeft}`
                                                    : 'Out of stock'}
                                                {pantryItem.expirationDate
                                                    ? ` · expires ${new Date(pantryItem.expirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                                    : ''}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ) : inShopping ? (
                                <View style={s.pantryRow}>
                                    <View style={[s.stockDot, s.stockDotShop]} />
                                    <Text style={s.pantryShopText}>On your shopping list</Text>
                                </View>
                            ) : (
                                <View style={s.pantryRow}>
                                    <View style={[s.stockDot, s.stockDotMissing]} />
                                    <Text style={s.pantryMissingText}>Not in pantry</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* CTA bar */}
                <View style={[s.ctaBar, { paddingBottom: insets.bottom + 10 }]}>
                    {inPantry ? (
                        <TouchableOpacity
                            style={s.ctaSecondary}
                            onPress={() => {
                                if (!pantryItem) return
                                openActionDialog({
                                    title:        'Remove from pantry',
                                    message:      `Remove ${ingredient.name} from your pantry?`,
                                    confirmLabel: 'Remove',
                                    tone:         'danger',
                                    icon:         'close-circle-outline',
                                    onConfirm:    () => updatePantryItem.mutate({
                                        id: pantryItem.id,
                                        payload: { isInPantry: false },
                                    }),
                                })
                            }}
                        >
                            <Text style={s.ctaSecondaryText}>In pantry ✓</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={s.ctaPrimary} onPress={() => setShowAddModal(true)}>
                            <Text style={s.ctaPrimaryText}>Add to pantry</Text>
                        </TouchableOpacity>
                    )}
                    {!inShopping && !inPantry && (
                        <TouchableOpacity
                            style={s.ctaSecondary}
                            onPress={() => {
                                const payload = {
                                    ingredientId:     id,
                                    isInShoppingList: true,
                                    isInPantry:       false,
                                    quantity:         0,
                                    unitLeft:         ingredient.unit ?? 'pcs',
                                }
                                if (pantryItem) {
                                    updatePantryItem.mutate({ id: pantryItem.id, payload: { isInShoppingList: true } })
                                } else {
                                    addPantryItem.mutate(payload)
                                }
                            }}
                        >
                            <Text style={s.ctaSecondaryText}>+ Shopping list</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Add to pantry modal */}
            <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
                <AddToPantryModal
                    visible={showAddModal}
                    ingredientName={ingredient.name}
                    defaultUnit={(ingredient.unit ?? 'cl') as Unit}
                    onClose={() => setShowAddModal(false)}
                    onConfirm={(qty, unit) => {
                        const payload = {
                            ingredientId: id,
                            quantity:     qty,
                            unitLeft:     unit,
                            isInPantry:   true,
                            isInShoppingList: false,
                        }
                        if (pantryItem) {
                            updatePantryItem.mutate({ id: pantryItem.id, payload: { quantity: qty, unitLeft: unit, isInPantry: true } })
                        } else {
                            addPantryItem.mutate(payload)
                        }
                        setShowAddModal(false)
                    }}
                    insets={insets}
                />
            </Modal>
            {actionDialog}
        </>
    )
}

function AddToPantryModal({ visible, ingredientName, defaultUnit, onClose, onConfirm, insets }: {
    visible:        boolean
    ingredientName: string
    defaultUnit:    Unit
    onClose:        () => void
    onConfirm:      (qty: number, unit: Unit) => void
    insets:         { bottom: number }
}) {
    const initialUnit = normalizeUnit(defaultUnit)
    const [qtyInput, setQtyInput] = useState(defaultQuantityText(initialUnit))
    const [unit, setUnit] = useState<Unit>(initialUnit)

    useEffect(() => {
        if (!visible) return
        const nextUnit = normalizeUnit(defaultUnit)
        setUnit(nextUnit)
        setQtyInput(defaultQuantityText(nextUnit))
    }, [visible, defaultUnit])

    function stepQty(delta: number) {
        const next = Math.max(0, parseQuantity(qtyInput) + delta)
        setQtyInput(Number.isInteger(next) ? String(next) : next.toFixed(1))
    }

    function selectUnit(nextUnit: Unit) {
        const shouldUseDefault = qtyInput.trim() === '' || isDefaultQuantityText(qtyInput, unit)
        setUnit(nextUnit)
        if (shouldUseDefault) setQtyInput(defaultQuantityText(nextUnit))
    }

    return (
        <Pressable style={m.overlay} onPress={onClose}>
            <Pressable style={[m.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={e => e.stopPropagation()}>
                <View style={m.handle} />
                <Text style={m.title}>Add to pantry</Text>
                <Text style={m.sub}>{ingredientName}</Text>

                {/* Qty stepper */}
                <View style={m.stepRow}>
                    <TouchableOpacity
                        style={m.stepBtn}
                        onPress={() => stepQty(-1)}
                        accessibilityRole="button"
                        accessibilityLabel="Decrease quantity"
                    >
                        <Ionicons name="remove" size={18} color={C.ink} />
                    </TouchableOpacity>
                    <TextInput
                        style={m.qtyInput}
                        value={qtyInput}
                        onChangeText={setQtyInput}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                    />
                    <TouchableOpacity
                        style={m.stepBtn}
                        onPress={() => stepQty(1)}
                        accessibilityRole="button"
                        accessibilityLabel="Increase quantity"
                    >
                        <Ionicons name="add" size={18} color={C.ink} />
                    </TouchableOpacity>
                </View>

                {/* Unit picker */}
                <View style={m.unitRow}>
                    {UNITS.map(u => (
                        <TouchableOpacity
                            key={u}
                            style={[m.unitBtn, unit === u && m.unitBtnActive]}
                            onPress={() => selectUnit(u)}
                        >
                            <Text style={[m.unitText, unit === u && m.unitTextActive]}>{u}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={m.confirmBtn} onPress={() => onConfirm(parseQuantity(qtyInput), unit)}>
                    <Text style={m.confirmText}>Confirm</Text>
                </TouchableOpacity>
            </Pressable>
        </Pressable>
    )
}

const s = StyleSheet.create({
    root:         { flex: 1, backgroundColor: C.cream },
    center:       { justifyContent: 'center', alignItems: 'center' },

    hero:         { height: 400, position: 'relative', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    heroImg:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    heroSheen:    { position: 'absolute', top: -40, right: -20, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.18)' },
    heroGlyph:    { fontFamily: F.head, fontStyle: 'italic', fontSize: 110, color: 'rgba(255,255,255,0.35)' },
    heroScrim:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, backgroundColor: 'rgba(0,0,0,0.3)' },
    heroNameWrap: { position: 'absolute', bottom: 18, left: 20, right: 80 },
    heroName:     { fontFamily: F.head, fontStyle: 'italic', fontSize: 30, fontWeight: '400', color: '#f5ece0', lineHeight: 34 },

    circleBtn:    { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(251,249,246,0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },

    badgeStrip:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
    badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.creamWarm, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    badgeText:    { fontSize: 12, color: C.ink, fontWeight: '500' },
    badgeAlc:     { backgroundColor: '#f4dfd4' },
    badgeAlcText: { color: '#a8472a' },
    badgeNonAlc:  { backgroundColor: '#e8ece0' },
    badgeNonAlcText: { color: '#6a7a5a' },

    body:         { padding: 20 },

    descSection:  { marginBottom: 22 },
    desc:         { fontSize: 14, color: C.ink, lineHeight: 22 },
    readMore:     { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: C.bronze },

    pantryCard:   { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16 },
    pantryLabel:  { fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: C.mute, marginBottom: 12 },
    pantryRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stockDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: C.bronze, flexShrink: 0 },
    stockDotShop: { backgroundColor: C.bronzeLight },
    stockDotMissing: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.border },
    pantryHaveText:  { fontSize: 14, fontWeight: '600', color: C.ink },
    pantryQty:       { fontSize: 12, color: C.mute, marginTop: 2 },
    pantryShopText:  { fontSize: 14, fontWeight: '600', color: C.bronze },
    pantryMissingText:{ fontSize: 14, color: C.mute },

    ctaBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10, backgroundColor: 'rgba(251,249,246,0.96)', borderTopWidth: 1, borderTopColor: C.border },
    ctaPrimary:   { flex: 1, backgroundColor: C.bronze, borderRadius: 13, paddingVertical: 12, alignItems: 'center' },
    ctaPrimaryText:{ fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: '#f5ece0' },
    ctaSecondary: { flex: 1, borderRadius: 13, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: C.bronze, backgroundColor: C.card },
    ctaSecondaryText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: C.bronze },
    errorText:    { fontFamily: F.head, fontStyle: 'italic', fontSize: 20, color: C.ink, marginBottom: 12 },
    errorBack:    { fontSize: 13, color: C.bronze, textDecorationLine: 'underline' },
})

const m = StyleSheet.create({
    overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet:       { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12 },
    handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 },
    title:       { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, color: C.ink, marginBottom: 4 },
    sub:         { fontSize: 13, color: C.mute, marginBottom: 24 },
    stepRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 },
    stepBtn:     { width: 48, height: 48, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    qtyInput:    { minWidth: 110, height: 48, borderWidth: 1, borderColor: C.border, borderRadius: 16, backgroundColor: C.card, textAlign: 'center', fontSize: 20, fontWeight: '700', color: C.ink, fontFamily: F.mono },
    unitRow:     { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 },
    unitBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.cream },
    unitBtnActive:{ backgroundColor: C.bronze, borderColor: C.bronze },
    unitText:    { fontSize: 13, color: C.mute },
    unitTextActive: { color: '#fff', fontWeight: '700' },
    confirmBtn:  { backgroundColor: C.bronze, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    confirmText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#f5ece0' },
})
