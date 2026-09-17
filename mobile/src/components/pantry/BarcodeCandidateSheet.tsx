import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SwipeableSheet } from '@/components/ui/SwipeableSheet'
import { C, F } from '@/theme/brand'
import type { BarcodeIngredientCandidate, BarcodeProductInfo } from '@/api/endpoints/ingredients'

interface Props {
    visible:    boolean
    onClose:    () => void
    product:    BarcodeProductInfo | null
    candidates: BarcodeIngredientCandidate[]
    onPick:     (candidate: BarcodeIngredientCandidate) => void
    onSearchManually: () => void
}

export function BarcodeCandidateSheet({
    visible, onClose, product, candidates, onPick, onSearchManually,
}: Props) {
    const productLabel = product
        ? [product.brand, product.productName].filter(Boolean).join(' · ')
        : 'Scanned product'

    return (
        <SwipeableSheet visible={visible} onClose={onClose}>
            <View style={s.header}>
                <Text style={s.eyebrow}>Which one is it?</Text>
                <Text style={s.title} numberOfLines={2}>{productLabel}</Text>
                {product?.quantity ? <Text style={s.sub}>{product.quantity}</Text> : null}
            </View>

            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingVertical: 4 }}>
                {candidates.map(c => (
                    <TouchableOpacity
                        key={c.id}
                        style={s.row}
                        onPress={() => onPick(c)}
                        activeOpacity={0.7}
                    >
                        <View style={s.iconCircle}>
                            <Text style={s.iconLetter}>{c.name.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.itemName} numberOfLines={1}>{c.name}</Text>
                            <Text style={s.itemSub} numberOfLines={1}>
                                {[c.brand, c.subTypeName ?? c.typeName].filter(Boolean).join(' · ') || '—'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.border} />
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity style={s.manualBtn} onPress={onSearchManually}>
                <Ionicons name="search-outline" size={16} color={C.bronze} />
                <Text style={s.manualText}>Search manually instead</Text>
            </TouchableOpacity>
        </SwipeableSheet>
    )
}

const s = StyleSheet.create({
    header:  { paddingHorizontal: 4, paddingBottom: 12, gap: 4 },
    eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.bronze },
    title:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, color: C.ink, lineHeight: 26 },
    sub:     { fontFamily: F.mono, fontSize: 11, color: C.mute, marginTop: 2 },

    row: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 4, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    iconCircle: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: C.creamWarm,
    },
    iconLetter: { fontFamily: F.head, fontStyle: 'italic', fontSize: 14, color: C.bronze },
    itemName:   { fontSize: 14, fontWeight: '600', color: C.ink },
    itemSub:    { fontSize: 11, color: C.mute, marginTop: 3 },

    manualBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginTop: 14, paddingVertical: 12,
        borderRadius: 999, backgroundColor: C.creamWarm,
    },
    manualText: { fontFamily: F.mono, fontSize: 12, color: C.bronze, fontWeight: '600', letterSpacing: 0.4 },
})
