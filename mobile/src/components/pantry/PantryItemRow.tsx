import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { UserPantryItemDTO } from '@mixoguide/shared'
import { useDeletePantryItem, useMoveToPantry } from '@/features/pantry/hooks'
import { useActionDialog } from '@/components/ui/ActionDialog'

interface Props {
    item:   UserPantryItemDTO
    mode:   'pantry' | 'shopping'
}

export function PantryItemRow({ item, mode }: Props) {
    const deleteMutation   = useDeletePantryItem()
    const moveMutation     = useMoveToPantry()
    const { openActionDialog, actionDialog } = useActionDialog()

    const ingredientName = item.ingredient?.name ?? 'Unknown ingredient'
    const typeName       = item.ingredient?.type?.name ?? ''

    function confirmDelete() {
        openActionDialog({
            title:        'Remove item',
            message:      `Remove ${ingredientName} from your ${mode === 'pantry' ? 'pantry' : 'shopping list'}?`,
            confirmLabel: 'Remove',
            tone:         'danger',
            icon:         'close-circle-outline',
            onConfirm:    () => deleteMutation.mutate(item.id),
        })
    }

    function handleMoveToPantry() {
        moveMutation.mutate({
            ingredientId: item.ingredientId,
            amount:       item.shoppingQuantity ?? 1,
            unitLeft:     item.unitLeft,
        })
    }

    const qty   = mode === 'pantry' ? item.quantity : item.shoppingQuantity
    const unit  = item.unitLeft

    return (
        <>
        <View style={s.row}>
            {/* Icon circle */}
            <View style={[s.icon, item.ingredient?.isAlcoholic ? s.iconAlc : s.iconNonAlc]}>
                <Text style={s.iconText}>{ingredientName.charAt(0).toUpperCase()}</Text>
            </View>

            {/* Info */}
            <View style={s.info}>
                <Text style={s.name} numberOfLines={1}>{ingredientName}</Text>
                {typeName ? <Text style={s.type}>{typeName}</Text> : null}
            </View>

            {/* Qty */}
            <Text style={s.qty}>
                {qty != null && qty > 0 ? `${qty} ${unit}` : '—'}
            </Text>

            {/* Actions */}
            {mode === 'shopping' ? (
                <TouchableOpacity
                    style={s.moveBtn}
                    onPress={handleMoveToPantry}
                disabled={moveMutation.isPending}
                hitSlop={6}
            >
                <Ionicons name="checkmark" size={15} color="#16a34a" />
            </TouchableOpacity>
            ) : null}

            <TouchableOpacity
                style={s.deleteBtn}
                onPress={confirmDelete}
                disabled={deleteMutation.isPending}
                hitSlop={6}
            >
                <Ionicons name="close" size={14} color="#ef4444" />
            </TouchableOpacity>
        </View>
        {actionDialog}
        </>
    )
}

const s = StyleSheet.create({
    row:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
    icon:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    iconAlc:    { backgroundColor: '#fef3c7' },
    iconNonAlc: { backgroundColor: '#f0fdf4' },
    iconText:   { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    info:       { flex: 1, gap: 2 },
    name:       { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
    type:       { fontSize: 12, color: '#9ca3af' },
    qty:        { fontSize: 13, color: '#6b7280', minWidth: 50, textAlign: 'right' },
    moveBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
    deleteBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
})
