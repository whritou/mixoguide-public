import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import {
    Animated,
    Easing,
    Modal,
    PanResponder,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from '@/theme/brand'

interface Props {
    visible: boolean
    onClose: () => void
    children: ReactNode
    maxHeightRatio?: number
    sheetStyle?: StyleProp<ViewStyle>
}

export function SwipeableSheet({
    visible,
    onClose,
    children,
    maxHeightRatio = 0.92,
    sheetStyle,
}: Props) {
    const insets = useSafeAreaInsets()
    const { height } = useWindowDimensions()
    const translateY = useRef(new Animated.Value(height)).current
    const [mounted, setMounted] = useState(visible)
    const heightRef = useRef(height)
    const mountedRef = useRef(visible)
    const closingRef = useRef(false)
    const onCloseRef = useRef(onClose)

    useEffect(() => {
        heightRef.current = height
        if (!mountedRef.current) translateY.setValue(height)
    }, [height, translateY])

    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    const setMountedState = useCallback((next: boolean) => {
        mountedRef.current = next
        setMounted(next)
    }, [])

    const openSheet = useCallback(() => {
        closingRef.current = false
        setMountedState(true)
        translateY.stopAnimation()
        translateY.setValue(heightRef.current)
        requestAnimationFrame(() => {
            Animated.timing(translateY, {
                toValue: 0,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start()
        })
    }, [setMountedState, translateY])

    const closeSheet = useCallback((notify: boolean) => {
        if (closingRef.current) return
        closingRef.current = true
        translateY.stopAnimation()
        Animated.timing(translateY, {
            toValue: heightRef.current,
            duration: 210,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (!finished) {
                closingRef.current = false
                return
            }
            setMountedState(false)
            translateY.setValue(heightRef.current)
            closingRef.current = false
            if (notify) onCloseRef.current()
        })
    }, [setMountedState, translateY])

    useEffect(() => {
        if (visible) openSheet()
        else if (mountedRef.current) closeSheet(false)
    }, [closeSheet, openSheet, visible])

    function snapBack() {
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
        }).start()
    }

    function closeFromSwipe() {
        closeSheet(true)
    }

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) =>
                gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) translateY.setValue(gesture.dy)
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > 72 || gesture.vy > 1.1) closeFromSwipe()
                else snapBack()
            },
            onPanResponderTerminate: snapBack,
        })
    ).current

    const topGap = Math.max(36, insets.top + 24)
    const sheetHeight = Math.max(280, Math.min(height - topGap, height * maxHeightRatio))
    const backdropOpacity = translateY.interpolate({
        inputRange: [0, Math.max(1, heightRef.current)],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    })

    return (
        <Modal
            visible={mounted}
            transparent
            animationType="none"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            onRequestClose={() => closeSheet(true)}
        >
            <View style={s.overlay}>
                <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => closeSheet(true)} />
                </Animated.View>
                <Animated.View
                    style={[
                        s.sheet,
                        { height: sheetHeight, transform: [{ translateY }] },
                        sheetStyle,
                    ]}
                >
                    <View style={s.handleArea} {...panResponder.panHandlers}>
                        <View style={s.handle} />
                    </View>
                    {children}
                </Animated.View>
            </View>
        </Modal>
    )
}

const s = StyleSheet.create({
    overlay:    { flex: 1, justifyContent: 'flex-end' },
    backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(27,28,26,0.28)' },
    sheet:      {
        backgroundColor: C.cream,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        shadowColor: C.bronze,
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -8 },
        elevation: 14,
    },
    handleArea: { alignItems: 'center', justifyContent: 'center', minHeight: 32, paddingTop: 12, paddingBottom: 10 },
    handle:     { width: 38, height: 4, borderRadius: 2, backgroundColor: C.borderWarm },
})
