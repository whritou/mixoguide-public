import { useEffect, useState } from 'react'
import { Stack, useNavigationContainerRef } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/auth/AuthProvider'
import { useAuth } from '@/auth/useAuth'
import { StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { ActionDialogHost } from '@/components/ui/ActionDialog'
import { ToastContainer } from '@/components/ui/Toast'
import { ProductTourProvider } from '@/onboarding/ProductTour'
import { C } from '@/theme/brand'
import { initSentry, wrap } from '@/lib/sentry'

initSentry()
import {
    registerForPushNotifications,
    addNotificationReceivedListener,
    addNotificationResponseListener,
    syncLocalNotifications,
    clearLocalNotifications,
} from '@/lib/notifications'
import { router } from 'expo-router'
import { usePantryItems } from '@/features/pantry/hooks'
import { usePlannedCocktails, usePlannedCollections } from '@/features/planner/hooks'

function NotificationBootstrap() {
    const { user } = useAuth()
    const notificationsEnabled = !!user
    const { data: plannedCocktails = [] } = usePlannedCocktails(notificationsEnabled)
    const { data: plannedCollections = [] } = usePlannedCollections(notificationsEnabled)
    const { data: pantryItems = [] } = usePantryItems(notificationsEnabled)

    useEffect(() => {
        if (!user) return
        registerForPushNotifications()
    }, [user?.id])

    useEffect(() => {
        if (!user) {
            void clearLocalNotifications()
            return
        }

        void syncLocalNotifications({
            plannedCocktails,
            plannedCollections,
            pantryItems,
        })
    }, [pantryItems, plannedCocktails, plannedCollections, user?.id])

    useEffect(() => {
        const sub1 = addNotificationReceivedListener(_n => {
            // Foreground notifications shown automatically via setNotificationHandler
        })
        const sub2 = addNotificationResponseListener(response => {
            const data = response.notification.request.content.data as Record<string, unknown> | undefined
            if (typeof data?.cocktailId === 'string') {
                router.push(`/cocktail/${data.cocktailId}`)
                return
            }

            if (typeof data?.route === 'string') {
                router.push(data.route)
            }
        })
        return () => { sub1.remove(); sub2.remove() }
    }, [])

    return null
}

function StatusBarBackdrop() {
    const insets = useSafeAreaInsets()
    const height = Math.max(insets.top, NativeStatusBar.currentHeight ?? 0)

    if (height <= 0) return null
    return <View pointerEvents="none" style={[styles.statusBarBackdrop, { height }]} />
}

function RootLayout() {
    const navigationRef = useNavigationContainerRef()
    const [navigationReady, setNavigationReady] = useState(false)

    useEffect(() => {
        let frame: number | null = null

        const checkReady = () => {
            if (navigationRef.isReady()) {
                setNavigationReady(true)
                return
            }

            frame = requestAnimationFrame(checkReady)
        }

        checkReady()

        return () => {
            if (frame !== null) cancelAnimationFrame(frame)
        }
    }, [navigationRef])

    return (
        <GestureHandlerRootView style={styles.root}>
            <StatusBar style="dark" backgroundColor={C.card} />
            <ErrorBoundary>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider navigationReady={navigationReady}>
                        <ProductTourProvider>
                            <NotificationBootstrap />
                            <OfflineBanner />
                            <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="(auth)" />
                                <Stack.Screen name="(tabs)" />
                                <Stack.Screen name="auth/google" options={{ headerShown: false, animation: 'none' }} />
                                <Stack.Screen name="reset-password" />
                                <Stack.Screen name="cocktail/[id]" />
                                <Stack.Screen name="ingredient/[id]" />
                                <Stack.Screen name="planner/collection/[id]" />
                                <Stack.Screen name="profile/edit" />
                                <Stack.Screen name="profile/change-password" />
                                <Stack.Screen name="profile/suggestions" />
                            </Stack>
                            <StatusBarBackdrop />
                            <ActionDialogHost />
                            <ToastContainer />
                        </ProductTourProvider>
                    </AuthProvider>
                </QueryClientProvider>
            </ErrorBoundary>
        </GestureHandlerRootView>
    )
}

export default wrap(RootLayout)

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.card },
    statusBarBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: C.card,
        zIndex: 50,
        elevation: 0,
    },
})
