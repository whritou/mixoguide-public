import { useEffect, useRef, useState } from 'react'
import { View, Text, Animated, Easing, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/theme/brand'

const TIPS = [
    'Stirring the spirits…',
    'Polishing the coupe…',
    'Chilling the glass…',
]

const RING = 120
const RING_R = RING / 2

export function LoadingScreen() {
    const spinAnim    = useRef(new Animated.Value(0)).current
    const shimmerAnim = useRef(new Animated.Value(0)).current
    const [tipIdx, setTipIdx] = useState(0)

    useEffect(() => {
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 2400,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start()

        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            })
        ).start()

        const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 2200)
        return () => clearInterval(id)
    }, [])

    const spin = spinAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: ['0deg', '360deg'],
    })

    // Shimmer travels from off-left to off-right of the 200px track
    const shimmerX = shimmerAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: [-80, 280],
    })

    return (
        <View style={s.root}>
            {/* Warm radial glow at top — approximated with a soft oval */}
            <View style={s.topGlow} />

            {/* Spinner */}
            <View style={s.spinWrap}>
                {/* Faint full ring */}
                <View style={s.ringFaint} />

                {/* Spinning arc: 3/4 visible (bottom-left gap = 'transparent') */}
                <Animated.View style={[s.ringArc, { transform: [{ rotate: spin }] }]} />

                {/* Leading dot at 12 o'clock of the spinner */}
                <Animated.View style={[s.dotAnchor, { transform: [{ rotate: spin }] }]}>
                    <View style={s.dot} />
                </Animated.View>

                {/* Centered wine glass mark */}
                <View style={s.markWrap} pointerEvents="none">
                    <Ionicons name="wine-outline" size={32} color={C.bronze} />
                </View>
            </View>

            {/* Wordmark */}
            <Text style={s.eyebrow}>MixoGuide</Text>
            <View style={{ height: 14 }} />
            <Text style={s.headline}>Pouring something{'\n'}good</Text>
            <View style={{ height: 14 }} />
            <Text style={s.tip}>{TIPS[tipIdx]}</Text>

            {/* Shimmer progress bar */}
            <View style={s.barTrack}>
                <Animated.View style={[s.barShimmer, { transform: [{ translateX: shimmerX }] }]} />
            </View>
        </View>
    )
}

const s = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: C.cream,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        zIndex: 999,
    },

    // Soft warm blob at the top of the screen
    topGlow: {
        position: 'absolute',
        top: -60, left: '10%', right: '10%',
        height: 280,
        borderRadius: 999,
        backgroundColor: C.creamWarm,
        opacity: 0.7,
    },

    // ── Spinner ────────────────────────────────────────────────────────────────
    spinWrap: {
        width: RING, height: RING,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
    },

    ringFaint: {
        position: 'absolute',
        width: RING, height: RING, borderRadius: RING_R,
        borderWidth: 1, borderColor: C.borderWarm,
        opacity: 0.5,
    },

    // 3/4 arc: bronze on top/right/bottom, transparent on left
    ringArc: {
        position: 'absolute',
        width: RING, height: RING, borderRadius: RING_R,
        borderWidth: 2,
        borderTopColor: C.bronze,
        borderRightColor: C.bronzeLight,
        borderBottomColor: C.bronzeLight,
        borderLeftColor: 'transparent',
    },

    // Container that rotates with the arc — dot sits at top-centre of it
    dotAnchor: {
        position: 'absolute',
        width: RING, height: RING,
        alignItems: 'center',
    },

    dot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: C.bronze,
        marginTop: 4,
    },

    markWrap: {
        position: 'absolute',
        alignItems: 'center', justifyContent: 'center',
    },

    // ── Typography ────────────────────────────────────────────────────────────
    eyebrow: {
        fontSize: 10, fontWeight: '700',
        letterSpacing: 2.2, textTransform: 'uppercase',
        color: C.bronze,
    },

    headline: {
        fontFamily: F.head,
        fontStyle: 'italic',
        fontSize: 28, fontWeight: '400',
        color: C.ink, lineHeight: 32,
        textAlign: 'center',
    },

    tip: {
        fontSize: 13, color: C.mute,
        textAlign: 'center', lineHeight: 20,
    },

    // ── Shimmer bar ───────────────────────────────────────────────────────────
    barTrack: {
        marginTop: 36,
        width: 200, height: 3, borderRadius: 2,
        backgroundColor: C.borderWarm,
        overflow: 'hidden',
    },

    barShimmer: {
        position: 'absolute',
        top: 0, left: 0,
        width: 80, height: 3, borderRadius: 2,
        backgroundColor: C.bronze,
        opacity: 0.75,
    },
})
