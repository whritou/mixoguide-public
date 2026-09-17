import { useState, useEffect, useRef } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { keys } from '@/lib/query-keys'
import { SwipeableSheet } from '@/components/ui/SwipeableSheet'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { C, F } from '@/theme/brand'
import type { GroceryItem } from '@/api/endpoints/planner'

type Status = 'in-stock' | 'in-list' | 'partial' | 'missing'
type Destination = 'shopping' | 'pantry'

interface Row extends GroceryItem {
    selected:    boolean
    destination: Destination
    quantity:    number
}

function statusOf(g: GroceryItem): Status {
    if (g.missing <= 0)  return 'in-stock'
    if (g.inWishlist)    return 'in-list'
    if (g.inPantry > 0)  return 'partial'
    return 'missing'
}

const STATUS_LABEL: Record<Status, string> = {
    'in-stock': 'In stock',
    'in-list':  'In list',
    'partial':  'Partial',
    'missing':  'Missing',
}

const STATUS_STYLE: Record<Status, { bg: string; text: string }> = {
    'in-stock': { bg: '#e8ece0', text: '#5a7050' },
    'in-list':  { bg: C.amber,  text: C.bronze   },
    'partial':  { bg: '#fde8c8', text: '#9a6020'  },
    'missing':  { bg: '#f4dfd4', text: '#a8472a'  },
}

function buildRows(items: GroceryItem[], defaultDestination: Destination): Row[] {
    return items.map(g => ({
        ...g,
        selected:    g.missing > 0,
        destination: defaultDestination,
        quantity:    Math.max(0.01, g.missing),
    }))
}

interface Props {
    visible:   boolean
    onClose:   () => void
    items:     GroceryItem[]
    submitUrl: string
    invalidateKeys?: readonly (readonly unknown[])[]
    onSuccess?: (result: { shopping: number; pantry: number }) => void
    defaultDestination?: Destination
}

export function AddIngredientsSheet({ visible, onClose, items, submitUrl, invalidateKeys, onSuccess, defaultDestination = 'shopping' }: Props) {
    const qc = useQueryClient()
    const [rows, setRows]         = useState<Row[]>(() => buildRows(items, defaultDestination))
    const [submitting, setSubmitting] = useState(false)
    const [error, setError]       = useState<string | null>(null)
    const prevOpen = useRef(false)

    useEffect(() => {
        if (visible && !prevOpen.current) {
            setRows(buildRows(items, defaultDestination))
            setError(null)
        }
        prevOpen.current = visible
    }, [defaultDestination, visible, items])

    const needAction   = rows.filter(r => r.missing > 0)
    const selectedRows = rows.filter(r => r.selected && r.missing > 0)
    const inStockCount = items.filter(g => g.missing <= 0).length

    function toggle(id: string) {
        setRows(prev => prev.map(r => r.ingredientId === id ? { ...r, selected: !r.selected } : r))
    }
    function setDest(id: string, destination: Destination) {
        setRows(prev => prev.map(r => r.ingredientId === id ? { ...r, destination } : r))
    }
    function updateQty(id: string, quantity: number) {
        setRows(prev => prev.map(r => r.ingredientId === id ? { ...r, quantity } : r))
    }
    function setAllDest(destination: Destination) {
        setRows(prev => prev.map(r => r.missing > 0 ? { ...r, destination } : r))
    }

    async function handleSubmit() {
        if (selectedRows.length === 0) return
        setSubmitting(true)
        setError(null)
        try {
            const res = await api.post<{ success: true; data: { addedToShopping: number; addedToPantry: number } }>(
                submitUrl,
                {
                    items: selectedRows.map(r => ({
                        ingredientId: r.ingredientId,
                        destination:  r.destination,
                        quantity:     r.quantity,
                        unit:         r.unit,
                    })),
                }
            )
            const { addedToShopping, addedToPantry } = res.data.data
            await qc.invalidateQueries({ queryKey: keys.pantry.items })
            await qc.invalidateQueries({ queryKey: keys.cocktails.makeable })
            for (const k of (invalidateKeys ?? [])) {
                await qc.invalidateQueries({ queryKey: k })
            }
            onSuccess?.({ shopping: addedToShopping, pantry: addedToPantry })
            onClose()
        } catch {
            setError('Could not add ingredients. Try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const allFullyStocked = needAction.length === 0
    const bulkDestination: Destination = needAction.every(r => r.destination === 'pantry') ? 'shopping' : 'pantry'
    const bulkDestinationLabel = bulkDestination === 'pantry' ? 'All to pantry' : 'All to shopping'
    const bulkDestinationIcon = bulkDestination === 'pantry' ? 'archive-outline' : 'cart-outline'

    return (
        <SwipeableSheet visible={visible} onClose={onClose}>
            <View style={s.root}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                        <Text style={s.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <View style={s.headerCenter}>
                        <Text style={s.eyebrow}>Stock up</Text>
                        <Text style={s.title}>Ingredients</Text>
                    </View>
                    <TouchableOpacity
                        style={[s.addBtn, (selectedRows.length === 0 || submitting) && s.addBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={selectedRows.length === 0 || submitting}
                    >
                        {submitting
                            ? <ActivityIndicator size="small" color="#f5ece0" />
                            : <Text style={[s.addText, selectedRows.length === 0 && s.addTextDisabled]}>
                                Add {selectedRows.length > 0 ? selectedRows.length : ''}
                              </Text>
                        }
                    </TouchableOpacity>
                </View>

                <View style={s.divider} />
                {error ? (
                    <View style={s.errorBox}>
                        <Ionicons name="alert-circle-outline" size={15} color="#a8472a" />
                        <Text style={s.errorText}>{error}</Text>
                    </View>
                ) : null}

                <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

                    {/* In-stock summary */}
                    {inStockCount > 0 && (
                        <View style={s.stockSummary}>
                            <Ionicons name="checkmark-circle" size={14} color="#5a7050" />
                            <Text style={s.stockSummaryText}>
                                {inStockCount} ingredient{inStockCount !== 1 ? 's' : ''} already in stock
                            </Text>
                        </View>
                    )}

                    {allFullyStocked ? (
                        <View style={s.allGood}>
                            <Ionicons name="checkmark-circle-outline" size={40} color="#5a7050" />
                            <Text style={s.allGoodTitle}>All stocked up!</Text>
                            <Text style={s.allGoodSub}>Every ingredient is already in your pantry.</Text>
                        </View>
                    ) : (
                        <>
                            {/* Need attention header */}
                            <View style={s.needRow}>
                                <Text style={s.needLabel}>
                                    {needAction.length} need{needAction.length === 1 ? 's' : ''} attention
                                </Text>
                                <TouchableOpacity
                                    style={s.bulkDestBtn}
                                    onPress={() => setAllDest(bulkDestination)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Switch all missing ingredients to ${bulkDestination}`}
                                >
                                    <Ionicons name={bulkDestinationIcon} size={13} color={C.bronze} />
                                    <Text style={s.bulkDestText}>{bulkDestinationLabel}</Text>
                                </TouchableOpacity>
                            </View>

                            {needAction.map(g => {
                                const row    = rows.find(r => r.ingredientId === g.ingredientId)!
                                const status = statusOf(g)
                                const style  = STATUS_STYLE[status]

                                return (
                                    <View
                                        key={g.ingredientId}
                                        style={[s.card, row.selected && s.cardSelected]}
                                    >
                                        {/* Top row */}
                                        <View style={s.cardTop}>
                                            <TouchableOpacity
                                                style={[s.checkbox, row.selected && s.checkboxSelected]}
                                                onPress={() => toggle(g.ingredientId)}
                                                hitSlop={8}
                                            >
                                                {row.selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                                            </TouchableOpacity>

                                            <View style={s.cardInfo}>
                                                <View style={s.cardNameRow}>
                                                    <Text style={s.cardName} numberOfLines={1}>{g.ingredientName}</Text>
                                                    <View style={[s.statusBadge, { backgroundColor: style.bg }]}>
                                                        <Text style={[s.statusText, { color: style.text }]}>
                                                            {STATUS_LABEL[status]}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={s.cardMeta}>
                                                    Need {g.missing}{g.unit ? ` ${g.unit}` : ''}
                                                    {g.inPantry > 0 ? `  ·  Have ${g.inPantry}${g.unit ? ` ${g.unit}` : ''}` : ''}
                                                    {g.inWishlist ? '  ·  Already in list' : ''}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Controls (when selected) */}
                                        {row.selected && (
                                            <View style={s.controls}>
                                                {/* Qty stepper */}
                                                <QuantityStepper
                                                    value={row.quantity}
                                                    unit={g.unit}
                                                    onChange={(quantity) => updateQty(g.ingredientId, quantity)}
                                                    decreaseLabel={`Decrease quantity for ${g.ingredientName}`}
                                                    increaseLabel={`Increase quantity for ${g.ingredientName}`}
                                                />

                                                {/* Destination toggle */}
                                                <View style={s.destRow}>
                                                    <TouchableOpacity
                                                        style={[s.destBtn, row.destination === 'shopping' && s.destBtnActive]}
                                                        onPress={() => setDest(g.ingredientId, 'shopping')}
                                                    >
                                                        <Ionicons
                                                            name="cart-outline"
                                                            size={13}
                                                            color={row.destination === 'shopping' ? '#fff' : C.mute}
                                                        />
                                                        <Text style={[s.destText, row.destination === 'shopping' && s.destTextActive]}>
                                                            Shopping
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[s.destBtn, row.destination === 'pantry' && s.destBtnActive]}
                                                        onPress={() => setDest(g.ingredientId, 'pantry')}
                                                    >
                                                        <Ionicons
                                                            name="archive-outline"
                                                            size={13}
                                                            color={row.destination === 'pantry' ? '#fff' : C.mute}
                                                        />
                                                        <Text style={[s.destText, row.destination === 'pantry' && s.destTextActive]}>
                                                            Pantry
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )
                            })}
                        </>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </SwipeableSheet>
    )
}

const s = StyleSheet.create({
    root:         { flex: 1, backgroundColor: C.cream },

    header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
    headerCenter: { alignItems: 'center', flex: 1 },
    eyebrow:      { fontSize: 8, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: C.bronze, marginBottom: 2 },
    title:        { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, fontWeight: '400', color: C.ink },

    cancelBtn:    { minWidth: 76 },
    cancelText:   { fontSize: 13, color: C.mute, fontWeight: '500' },
    addBtn:       { minWidth: 76, height: 38, borderRadius: 19, paddingHorizontal: 14, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center' },
    addBtnDisabled:{ backgroundColor: C.creamWarm },
    addText:      { fontSize: 12, fontWeight: '800', color: '#f5ece0', letterSpacing: 0.8, textTransform: 'uppercase' },
    addTextDisabled: { color: C.mute },

    divider:      { height: 1, backgroundColor: C.border },
    errorBox:     { marginHorizontal: 16, marginTop: 10, borderRadius: 12, backgroundColor: '#f4dfd4', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    errorText:    { flex: 1, fontSize: 12, color: '#a8472a' },
    scroll:       { flex: 1, paddingHorizontal: 16 },

    stockSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
    stockSummaryText: { fontSize: 12, color: '#5a7050' },

    allGood:      { alignItems: 'center', paddingVertical: 60, gap: 10 },
    allGoodTitle: { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, color: '#5a7050' },
    allGoodSub:   { fontSize: 13, color: C.mute, textAlign: 'center' },

    needRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
    needLabel:    { fontSize: 9, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: C.mute },
    bulkDestBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingLeft: 10 },
    bulkDestText: { fontSize: 13, color: C.bronze, fontWeight: '600' },

    card:         { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
    cardSelected: { borderColor: C.bronzeLight },

    cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    checkbox:     { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
    checkboxSelected: { backgroundColor: C.bronze, borderColor: C.bronze },

    cardInfo:     { flex: 1, minWidth: 0 },
    cardNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    cardName:     { fontSize: 14, fontWeight: '600', color: C.ink },
    cardMeta:     { fontSize: 11, color: C.mute, marginTop: 3 },

    statusBadge:  { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    statusText:   { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },

    controls:     { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },

    destRow:      { flexDirection: 'row', borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    destBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
    destBtnActive:{ backgroundColor: C.bronze },
    destText:     { fontSize: 10, fontWeight: '600', color: C.mute, letterSpacing: 0.5 },
    destTextActive:{ color: '#fff' },
})
