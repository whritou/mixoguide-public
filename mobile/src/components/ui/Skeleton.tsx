import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native'

interface Props {
    width?: DimensionValue
    height?: number
    borderRadius?: number
    style?: ViewStyle
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
    const opacity = useRef(new Animated.Value(0.4)).current

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            ])
        )
        anim.start()
        return () => anim.stop()
    }, [opacity])

    return (
        <Animated.View
            style={[{ width, height, borderRadius, backgroundColor: '#e5e7eb', opacity }, style]}
        />
    )
}

export function CocktailCardSkeleton() {
    return (
        <View style={sk.card}>
            <Skeleton height={160} borderRadius={12} />
            <View style={sk.body}>
                <Skeleton height={16} width="70%" />
                <View style={sk.row}>
                    <Skeleton height={12} width={60} />
                    <Skeleton height={12} width={40} />
                </View>
            </View>
        </View>
    )
}

const sk = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
    body: { padding: 12, gap: 8 },
    row:  { flexDirection: 'row', gap: 8, marginTop: 4 },
})
