import { useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SwipeableSheet } from '@/components/ui/SwipeableSheet'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { showGlobalNoticeDialog } from '@/components/ui/ActionDialog'
import { useRestockPantryItems } from '@/features/pantry/hooks'
import { C, F } from '@/theme/brand'
import { isRestockCandidate, restockQuantityForUnit } from '@/lib/pantryRestock'
import type { UserPantryItemDTO } from '@mixoguide/shared'

type Row = {
    item: UserPantryItemDTO
    selected: boolean
    quantity: number
}

function buildRows(items: UserPantryItemDTO[]): Row[] {
    return items
        .filter(isRestockCandidate)
        .sort((a, b) => {
            const outSort = Number(a.quantity > 0) - Number(b.quantity > 0)
            if (outSort !== 0) return outSort
            return (a.ingredient?.name ?? '').localeCompare(b.ingredient?.name ?? '')
        })
        .map(item => ({
            item,
            selected: true,
            quantity: restockQuantityForUnit(item.unitLeft),
        }))
}

export function RestockPantrySheet({
    visible,
    onClose,
    items,
}: {
    visible: boolean
    onClose: () => void
    items: UserPantryItemDTO[]
}) {
    const restock = useRestockPantryItems()
    const [rows, setRows] = useState<Row[]>(() => buildRows(items))

    useEffect(() => {
        if (visible) setRows(buildRows(items))
    }, [visible, items])

    const selectedRows = useMemo(
        () => rows.filter(row => row.selected && row.quantity > 0),
        [rows],
    )

    function toggle(id: string) {
        setRows(prev => prev.map(row =>
            row.item.id === id ? { ...row, selected: !row.selected } : row
        ))
    }

    function updateQty(id: string, quantity: number) {
        setRows(prev => prev.map(row =>
            row.item.id === id ? { ...row, quantity } : row
        ))
    }

    function selectAll() {
        setRows(prev => prev.map(row => ({ ...row, selected: true })))
    }

    async function handleSubmit() {
        if (selectedRows.length === 0) return

        try {
            const res = await restock.mutateAsync(selectedRows.map(({ item, quantity }) => ({
                ingredientId: item.ingredientId,
                quantity,
                unit: item.unitLeft,
            })))
            showGlobalNoticeDialog({ title: 'Pantry restocked', message: `${res.data.data.addedToPantry} item${res.data.data.addedToPantry !== 1 ? 's' : ''} updated.`, tone: 'success', icon: 'checkmark-circle-outline' })
            onClose()
        } catch {
            showGlobalNoticeDialog({ title: 'Could not restock pantry', message: 'Please try again.', tone: 'danger', icon: 'close-circle-outline' })
        }
    }

    return (
        <SwipeableSheet visible={visible} onClose={onClose}>
            <View style={s.root}>
                <View style={s.header}>
                    <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                        <Text style={s.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <View style={s.headerCenter}>
                        <Text style={s.eyebrow}>Restock pantry</Text>
                        <Text style={s.title}>Low and empty</Text>
                    </View>

                    <TouchableOpacity
                        style={[s.addBtn, (selectedRows.length === 0 || restock.isPending) && s.addBtnDisabled]}
                        onPress={() => { void handleSubmit() }}
                        disabled={selectedRows.length === 0 || restock.isPending}
                        accessibilityRole="button"
                        accessibilityLabel={`Restock ${selectedRows.length} selected pantry items`}
                    >
                        {restock.isPending ? (
                            <ActivityIndicator size="small" color="#f5ece0" />
                        ) : (
                            <Text style={[s.addText, selectedRows.length === 0 && s.addTextDisabled]}>
                                Add {selectedRows.length > 0 ? selectedRows.length : ''}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={s.divider} />

                <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
                    {rows.length === 0 ? (
                        <View style={s.allGood}>
                            <Ionicons name="checkmark-circle-outline" size={40} color="#5a7050" />
                            <Text style={s.allGoodTitle}>All stocked up</Text>
                            <Text style={s.allGoodSub}>No low or empty pantry items right now.</Text>
                        </View>
                    ) : (
                        <>
                            <View style={s.needRow}>
                                <Text style={s.needLabel}>
                                    {rows.length} item{rows.length === 1 ? '' : 's'} need restock
                                </Text>
                                <TouchableOpacity onPress={selectAll}>
                                    <Text style={s.selectAll}>Select all</Text>
                                </TouchableOpacity>
                            </View>

                            {rows.map(row => {
                                const name = row.item.ingredient?.name ?? 'Unknown'
                                const out = row.item.quantity <= 0

                                return (
                                    <View key={row.item.id} style={[s.card, row.selected && s.cardSelected]}>
                                        <View style={s.cardTop}>
                                            <TouchableOpacity
                                                style={[s.checkbox, row.selected && s.checkboxSelected]}
                                                onPress={() => toggle(row.item.id)}
                                                accessibilityRole="button"
                                                accessibilityLabel={`${row.selected ? 'Remove' : 'Add'} ${name} from restock batch`}
                                                accessibilityState={{ selected: row.selected }}
                                                hitSlop={8}
                                            >
                                                {row.selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                                            </TouchableOpacity>

                                            <View style={s.cardInfo}>
                                                <View style={s.cardNameRow}>
                                                    <Text style={s.cardName} numberOfLines={1}>{name}</Text>
                                                    <View style={[s.statusBadge, out ? s.statusOut : s.statusLow]}>
                                                        <Text style={[s.statusText, out ? s.statusOutText : s.statusLowText]}>
                                                            {out ? 'Out' : 'Low'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={s.cardMeta}>
                                                    Current {row.item.quantity} {row.item.unitLeft}
                                                </Text>
                                            </View>
                                        </View>

                                        {row.selected && (
                                            <View style={s.controls}>
                                                <QuantityStepper
                                                    label="Add"
                                                    value={row.quantity}
                                                    unit={row.item.unitLeft}
                                                    onChange={(quantity) => updateQty(row.item.id, quantity)}
                                                    decreaseLabel={`Decrease restock quantity for ${name}`}
                                                    increaseLabel={`Increase restock quantity for ${name}`}
                                                />
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
    scroll:       { flex: 1, paddingHorizontal: 16 },

    allGood:      { alignItems: 'center', paddingVertical: 60, gap: 10 },
    allGoodTitle: { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, color: '#5a7050' },
    allGoodSub:   { fontSize: 13, color: C.mute, textAlign: 'center' },

    needRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
    needLabel:    { fontSize: 9, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: C.mute },
    selectAll:    { fontSize: 13, color: C.bronze, fontWeight: '500' },

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
    statusLow:    { backgroundColor: '#fde8c8' },
    statusOut:    { backgroundColor: '#f4dfd4' },
    statusText:   { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
    statusLowText:{ color: '#9a6020' },
    statusOutText:{ color: '#a8472a' },

    controls:     { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
})
