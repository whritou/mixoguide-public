import { useEffect, useRef, type ReactNode } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNetworkStore } from '@/store/networkStore'
import { C, F } from '@/theme/brand'

const BANNER_HIDDEN_Y = -120
const SHOW_HIDE_DELAY_MS = 1200

function OfflineScreen({ onRetry }: { onRetry: () => void }) {
    const insets = useSafeAreaInsets()

    return (
        <View style={[s.root, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 22 }]}> 
            <View style={s.offlinePill}>
                <View style={s.offlinePillDot} />
                <Text style={s.offlinePillText}>OFFLINE</Text>
            </View>

            <View style={s.centerWrap}>
                <View style={s.iconRing}>
                    <Ionicons name="cloud-offline-outline" size={32} color={C.bronze} />
                </View>

                <Text style={s.headline}>No connection</Text>
                <Text style={s.body}>Please check your internet and try again.</Text>

                <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.75}>
                    <Ionicons name="refresh" size={14} color="#f5ece0" />
                    <Text style={s.retryBtnText}>Retry</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

export function OfflineBanner() {
    const insets = useSafeAreaInsets()
    const isOnline = useNetworkStore(state => state.isOnline)
    const translateY = useRef(new Animated.Value(BANNER_HIDDEN_Y)).current
    const wasOffline = useRef(false)

    useEffect(() => {
        if (!isOnline) {
            wasOffline.current = true
            Animated.timing(translateY, {
                toValue: 0,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start()
            return
        }

        if (wasOffline.current) {
            Animated.sequence([
                Animated.delay(SHOW_HIDE_DELAY_MS),
                Animated.timing(translateY, {
                    toValue: BANNER_HIDDEN_Y,
                    duration: 220,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start(() => {
                wasOffline.current = false
            })
        }
    }, [isOnline, translateY])

    return (
        <Animated.View
            style={[
                sb.banner,
                { top: insets.top + 8, transform: [{ translateY }] },
                isOnline ? sb.online : sb.offline,
            ]}
            accessibilityLiveRegion="polite"
            pointerEvents="none"
        >
            <View style={[sb.iconWrap, isOnline ? sb.iconWrapOnline : sb.iconWrapOffline]}>
                <Ionicons
                    name={isOnline ? 'checkmark' : 'warning-outline'}
                    size={13}
                    color={isOnline ? '#5a7050' : '#f6bf7b'}
                />
            </View>
            <Text style={[sb.text, isOnline ? sb.textOnline : sb.textOffline]}>
                {isOnline ? 'Back online' : 'No connection'}
            </Text>
        </Animated.View>
    )
}

export function OfflineGate({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
    const isOnline = useNetworkStore(state => state.isOnline)
    if (!isOnline) return <OfflineScreen onRetry={onRetry ?? (() => {})} />
    return <>{children}</>
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.cream, paddingHorizontal: 24 },
    centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    offlinePill: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.heroDark,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    offlinePillDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#f6bf7b' },
    offlinePillText: { color: '#f5ece0', fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },

    iconRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 1,
        borderColor: C.borderWarm,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    headline: {
        fontFamily: F.head,
        fontStyle: 'italic',
        fontSize: 30,
        color: C.ink,
        marginBottom: 8,
    },
    body: {
        fontSize: 14,
        color: C.mute,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },

    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.bronze,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    retryBtnText: {
        color: '#f5ece0',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
    },
})

const sb = StyleSheet.create({
    banner: {
        position: 'absolute',
        left: 14,
        right: 14,
        minHeight: 44,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 14,
        zIndex: 999,
        elevation: 8,
    },
    online: {
        backgroundColor: C.creamWarm,
        borderColor: C.borderWarm,
    },
    offline: {
        backgroundColor: C.heroDark,
        borderColor: '#4a3626',
    },
    iconWrap: {
        width: 19,
        height: 19,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapOnline: { backgroundColor: '#e8ece0' },
    iconWrapOffline: { backgroundColor: 'rgba(246,191,123,0.15)' },
    text: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    textOnline: { color: '#5a7050' },
    textOffline: { color: '#f5ece0' },
})
