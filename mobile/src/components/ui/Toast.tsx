import { useEffect, useRef } from 'react'
import type { ComponentProps } from 'react'
import { Animated, Text, TouchableOpacity, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useToastStore, type ToastItem } from '@/store/toastStore'

type IconName = ComponentProps<typeof Ionicons>['name']

const TYPE_COLORS = {
    success: { bg: '#f0fdf4', border: '#16a34a', text: '#15803d', icon: 'checkmark-circle-outline' },
    error:   { bg: '#fef2f2', border: '#ef4444', text: '#dc2626', icon: 'close-circle-outline' },
    info:    { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8', icon: 'information-circle-outline' },
} satisfies Record<ToastItem['type'], { bg: string; border: string; text: string; icon: IconName }>

function ToastCard({ toast }: { toast: ToastItem }) {
    const opacity     = useRef(new Animated.Value(0)).current
    const translateY  = useRef(new Animated.Value(20)).current
    const remove      = useToastStore(s => s.removeToast)
    const colors      = TYPE_COLORS[toast.type]

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 8 }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start()
    }, [])

    return (
        <Animated.View style={[s.card, { backgroundColor: colors.bg, borderLeftColor: colors.border, opacity, transform: [{ translateY }] }]}>
            <Ionicons name={colors.icon} size={18} color={colors.text} style={s.icon} />
            <Text style={[s.message, { color: colors.text }]} numberOfLines={3}>{toast.message}</Text>
            <TouchableOpacity onPress={() => remove(toast.id)} hitSlop={8}>
                <Ionicons name="close" size={14} color={colors.text} style={s.close} />
            </TouchableOpacity>
        </Animated.View>
    )
}

export function ToastContainer() {
    const toasts = useToastStore(s => s.toasts)

    if (toasts.length === 0) return null

    return (
        <View style={s.container} pointerEvents="box-none">
            {toasts.map(t => <ToastCard key={t.id} toast={t} />)}
        </View>
    )
}

const s = StyleSheet.create({
    container: { position: 'absolute', bottom: 90, left: 16, right: 16, gap: 8, zIndex: 1000 },
    card:      { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderLeftWidth: 4, paddingVertical: 12, paddingHorizontal: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    icon:      { width: 18, textAlign: 'center' },
    message:   { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 18 },
    close:     { opacity: 0.6, padding: 2 },
})
