import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { router } from 'expo-router'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { authApi, type MobileUser } from '@/api/endpoints/auth'
import { authEvents, refreshStoredSession, setIsSignedOut, shouldClearTokensForRefreshError } from '@/api/client'
import { userApi } from '@/api/endpoints/user'
import { setTokens, clearTokens, getRefreshToken, hasSeenOnboarding, getBiometricEnabled } from './tokenStore'
import { requireUnlock } from './biometric'
import { captureException } from '@/lib/sentry'
import { showToast } from '@/store/toastStore'
import { getNativeGoogleIdToken, isGoogleNetworkError } from './googleNative'

interface AuthContextValue {
    user: MobileUser | null
    isLoading: boolean
    signIn: (email: string, password: string) => Promise<void>
    signInWithGoogle: () => Promise<void>
    signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function isGoogleCancelError(err: unknown) {
    return err instanceof Error && err.message === 'access_denied'
}

export function AuthProvider({
    children,
    navigationReady = true,
}: {
    children: React.ReactNode
    navigationReady?: boolean
}) {
    const [user, setUser] = useState<MobileUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const initialized = useRef(false)

    // On mount: restore the session from the persisted refresh token.
    useEffect(() => {
        if (!navigationReady) return
        if (initialized.current) return
        initialized.current = true

        async function init() {
            try {
                const refreshToken = await getRefreshToken()
                if (!refreshToken) {
                    const onboarded = await hasSeenOnboarding()
                    router.replace(onboarded ? '/(auth)/sign-in' : '/(auth)/onboard')
                    return
                }

                const biometricEnabled = await getBiometricEnabled()
                if (biometricEnabled) {
                    const unlocked = await requireUnlock()
                    if (!unlocked) {
                        setIsSignedOut(true)
                        await clearTokens()
                        router.replace('/(auth)/sign-in')
                        return
                    }
                }

                const { user: refreshedUser } = await refreshStoredSession()
                setIsSignedOut(false)

                if (refreshedUser) {
                    setUser(refreshedUser)
                } else {
                    const profile = await userApi.getProfile()
                    const { id, email, name, image, role } = profile.data.data
                    setUser({ id, email, name, image, role })
                }

                router.replace('/(tabs)')
            } catch (err) {
                // Keep local tokens for temporary network and server failures.
                if (shouldClearTokensForRefreshError(err)) {
                    setIsSignedOut(true)
                    await clearTokens()
                    router.replace('/(auth)/sign-in')
                } else {
                    setIsSignedOut(false)
                    captureException(err, { context: 'AuthProvider.restoreSession' })
                    showToast('Could not reach the server. Keeping your session on this device.', 'info')
                    router.replace('/(tabs)')
                }
            } finally {
                setIsLoading(false)
            }
        }

        init()
    }, [navigationReady])

    // Listen for forced sign-out from 401 interceptor
    useEffect(() => {
        const unsubscribe = authEvents.on('signedOut', () => {
            setUser(null)
            if (!navigationReady) return
            router.replace('/(auth)/sign-in')
        })

        return () => {
            unsubscribe()
        }
    }, [navigationReady])

    const signIn = useCallback(async (email: string, password: string) => {
        setIsLoading(true)
        try {
            const res = await authApi.login(email, password)
            const { accessToken, refreshToken, user: loggedInUser } = res.data.data
            await setTokens(accessToken, refreshToken)
            setIsSignedOut(false)
            setUser(loggedInUser)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const signInWithGoogle = useCallback(async () => {
        setIsLoading(true)
        try {
            let nativeIdToken: string | null = null

            try {
                nativeIdToken = await getNativeGoogleIdToken()
            } catch (err) {
                if (isGoogleCancelError(err)) throw err
                if (isGoogleNetworkError(err)) throw err
                captureException(err, { context: 'signInWithGoogle.native' })
                throw err
            }

            if (!nativeIdToken) {
                throw new Error('NATIVE_GOOGLE_UNAVAILABLE')
            }

            const res = await authApi.googleIdToken(nativeIdToken)
            const { accessToken, refreshToken, user: loggedInUser } = res.data.data

            await setTokens(accessToken, refreshToken)
            setIsSignedOut(false)
            setUser(loggedInUser)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const signOut = useCallback(async () => {
        setIsSignedOut(true)
        const refreshToken = await getRefreshToken()
        await clearTokens()
        setUser(null)
        router.replace('/(auth)/sign-in')
        if (refreshToken) {
            authApi.logout(refreshToken).catch((e: unknown) => {
                captureException(e, { context: 'signOut.revokeRefreshToken' })
                showToast('Signed out locally, but could not reach the server.', 'info')
            })
        }
    }, [])

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signInWithGoogle, signOut }}>
            {children}
            {isLoading && (
                <LoadingScreen />
            )}
        </AuthContext.Provider>
    )
}
