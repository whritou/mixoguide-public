import React from 'react'
import { Text } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { AuthProvider } from '../AuthProvider'
import { useAuth } from '../useAuth'

jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useRouter: () => ({ replace: jest.fn() }) }))
jest.mock('@/api/client', () => ({
    API_BASE_URL: 'https://mixoguide.com',
    authEvents: { on: jest.fn(() => jest.fn()), emit: jest.fn() },
    refreshStoredSession: jest.fn(),
    setIsSignedOut: jest.fn(),
    shouldClearTokensForRefreshError: jest.fn(() => true),
}))
jest.mock('@/api/endpoints/auth', () => ({
    authApi: {
        refresh: jest.fn(),
        login:   jest.fn(),
        logout:  jest.fn(),
        googleIdToken: jest.fn(),
    },
}))
jest.mock('@/api/endpoints/user', () => ({ userApi: { getProfile: jest.fn() } }))
jest.mock('@/store/toastStore', () => ({ showToast: jest.fn() }))
jest.mock('@/lib/sentry', () => ({ captureException: jest.fn(), captureMessage: jest.fn(), initSentry: jest.fn(), wrap: (c: unknown) => c }))
jest.mock('../googleNative', () => {
    const actual = jest.requireActual('../googleNative') as typeof import('../googleNative')
    return {
        ...actual,
        getNativeGoogleIdToken: jest.fn(() => Promise.resolve(null)),
    }
})
jest.mock('../biometric', () => ({ requireUnlock: jest.fn(() => Promise.resolve(true)), isBiometricAvailable: jest.fn(() => Promise.resolve(false)) }))
jest.mock('../tokenStore', () => ({
    getRefreshToken:     jest.fn(),
    setTokens:           jest.fn(() => Promise.resolve()),
    clearTokens:         jest.fn(() => Promise.resolve()),
    getOrCreateDeviceId: jest.fn(() => Promise.resolve('device-id')),
    hasSeenOnboarding:   jest.fn(() => Promise.resolve(false)),
    getBiometricEnabled: jest.fn(() => Promise.resolve(false)),
}))
jest.mock('@/components/ui/LoadingScreen', () => ({ LoadingScreen: () => null }))

import { router } from 'expo-router'
import { refreshStoredSession, shouldClearTokensForRefreshError } from '@/api/client'
import { authApi } from '@/api/endpoints/auth'
import { getRefreshToken, hasSeenOnboarding } from '../tokenStore'
import { getNativeGoogleIdToken } from '../googleNative'
import { captureException } from '@/lib/sentry'

function GoogleSignInTrigger({ onError }: { onError: (err: unknown) => void }) {
    const { signInWithGoogle } = useAuth()
    return <Text onPress={() => signInWithGoogle().catch(onError)}>Google</Text>
}

function SignInTrigger({ onError }: { onError: (err: unknown) => void }) {
    const { signIn } = useAuth()
    return <Text onPress={() => signIn('user@test.dev', 'password-1').catch(onError)}>SignIn</Text>
}

function SignOutTrigger({ onError }: { onError: (err: unknown) => void }) {
    const { signOut } = useAuth()
    return <Text onPress={() => signOut().catch(onError)}>SignOut</Text>
}

describe('AuthProvider boot', () => {
    afterEach(() => jest.clearAllMocks())

    it('waits for navigation readiness before boot redirects', async () => {
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce(null)
        ;(hasSeenOnboarding as jest.Mock).mockResolvedValueOnce(true)

        const screen = render(<AuthProvider navigationReady={false}>{null}</AuthProvider>)

        await new Promise(resolve => setTimeout(resolve, 0))
        expect(router.replace).not.toHaveBeenCalled()
        expect(getRefreshToken).not.toHaveBeenCalled()

        screen.rerender(<AuthProvider navigationReady>{null}</AuthProvider>)

        await waitFor(() => {
            expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-in')
        })
    })

    it('redirects to onboard when no refresh token and not onboarded', async () => {
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce(null)
        ;(hasSeenOnboarding as jest.Mock).mockResolvedValueOnce(false)

        render(<AuthProvider>{null}</AuthProvider>)

        await waitFor(() => {
            expect(router.replace).toHaveBeenCalledWith('/(auth)/onboard')
        })
    })

    it('redirects to sign-in when no refresh token but already onboarded', async () => {
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce(null)
        ;(hasSeenOnboarding as jest.Mock).mockResolvedValueOnce(true)

        render(<AuthProvider>{null}</AuthProvider>)

        await waitFor(() => {
            expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-in')
        })
    })

    it('refreshes the stored session and navigates to tabs when refresh token exists', async () => {
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce('valid-refresh')
        ;(refreshStoredSession as jest.Mock).mockResolvedValueOnce({
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            user: { id: '1', email: 'a@b.com', name: 'A', image: null, role: 'USER' },
        })

        render(<AuthProvider>{null}</AuthProvider>)

        await waitFor(() => {
            expect(refreshStoredSession).toHaveBeenCalled()
            expect(router.replace).toHaveBeenCalledWith('/(tabs)')
        })
    })

    it('clears tokens and redirects to sign-in when refresh call fails', async () => {
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce('expired-refresh')
        ;(refreshStoredSession as jest.Mock).mockRejectedValueOnce(
            Object.assign(new Error('Expired'), { response: { status: 401 } })
        )
        ;(shouldClearTokensForRefreshError as jest.Mock).mockReturnValueOnce(true)

        const { clearTokens } = require('../tokenStore')
        render(<AuthProvider>{null}</AuthProvider>)

        await waitFor(() => {
            expect(clearTokens).toHaveBeenCalled()
            expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-in')
        })
    })

    it('keeps tokens when boot refresh fails for a non-auth reason', async () => {
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce('valid-refresh')
        ;(refreshStoredSession as jest.Mock).mockRejectedValueOnce(
            Object.assign(new Error('Server unavailable'), { response: { status: 500 } })
        )
        ;(shouldClearTokensForRefreshError as jest.Mock).mockReturnValueOnce(false)

        const { clearTokens } = require('../tokenStore')
        const { showToast } = require('@/store/toastStore')
        render(<AuthProvider>{null}</AuthProvider>)

        await waitFor(() => {
            expect(showToast).toHaveBeenCalledWith(
                'Could not reach the server. Keeping your session on this device.',
                'info',
            )
        })
        expect(clearTokens).not.toHaveBeenCalled()
        expect(router.replace).not.toHaveBeenCalledWith('/(auth)/sign-in')
        expect(router.replace).toHaveBeenCalledWith('/(tabs)')
    })

    it('surfaces native Google auth failures without using browser auth', async () => {
        const nativeError = new Error('DEVELOPER_ERROR: Follow troubleshooting instructions')
        const onError = jest.fn()
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce(null)
        ;(hasSeenOnboarding as jest.Mock).mockResolvedValueOnce(true)
        ;(getNativeGoogleIdToken as jest.Mock).mockRejectedValueOnce(nativeError)

        const { getByText } = render(
            <AuthProvider>
                <GoogleSignInTrigger onError={onError} />
            </AuthProvider>
        )

        fireEvent.press(getByText('Google'))

        await waitFor(() => {
            expect(onError).toHaveBeenCalledWith(nativeError)
        })
        expect(authApi.googleIdToken).not.toHaveBeenCalled()
    })

    it('does not report native Google network errors', async () => {
        const networkError = Object.assign(new Error('NETWORK_ERROR'), {
            code: '7',
            name: 'com.google.android.gms.common.api.ApiException',
        })
        const onError = jest.fn()
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce(null)
        ;(hasSeenOnboarding as jest.Mock).mockResolvedValueOnce(true)
        ;(getNativeGoogleIdToken as jest.Mock).mockRejectedValueOnce(networkError)

        const { getByText } = render(
            <AuthProvider>
                <GoogleSignInTrigger onError={onError} />
            </AuthProvider>
        )

        fireEvent.press(getByText('Google'))

        await waitFor(() => {
            expect(onError).toHaveBeenCalledWith(networkError)
        })
        expect(captureException).not.toHaveBeenCalled()
        expect(authApi.googleIdToken).not.toHaveBeenCalled()
    })

    it('reports when native Google auth is unavailable', async () => {
        const onError = jest.fn()
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce(null)
        ;(hasSeenOnboarding as jest.Mock).mockResolvedValueOnce(true)
        ;(getNativeGoogleIdToken as jest.Mock).mockResolvedValueOnce(null)

        const { getByText } = render(
            <AuthProvider>
                <GoogleSignInTrigger onError={onError} />
            </AuthProvider>
        )

        fireEvent.press(getByText('Google'))

        await waitFor(() => {
            expect(onError.mock.calls[0][0]).toMatchObject({ message: 'NATIVE_GOOGLE_UNAVAILABLE' })
        })
        expect(authApi.googleIdToken).not.toHaveBeenCalled()
    })

    it('signs in with email/password and stores returned tokens', async () => {
        const onError = jest.fn()
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce(null)
        ;(hasSeenOnboarding as jest.Mock).mockResolvedValueOnce(true)
        ;(authApi.login as jest.Mock).mockResolvedValueOnce({
            data: {
                data: {
                    accessToken: 'access-1',
                    refreshToken: 'refresh-1',
                    user: { id: '1', email: 'user@test.dev', name: 'User', image: null, role: 'USER' },
                },
            },
        })

        const { setTokens } = require('../tokenStore')
        const { getByText } = render(
            <AuthProvider>
                <SignInTrigger onError={onError} />
            </AuthProvider>
        )

        fireEvent.press(getByText('SignIn'))

        await waitFor(() => {
            expect(authApi.login).toHaveBeenCalledWith('user@test.dev', 'password-1')
            expect(setTokens).toHaveBeenCalledWith('access-1', 'refresh-1')
        })
        expect(onError).not.toHaveBeenCalled()
    })

    it('uses native Google ID token flow when available', async () => {
        const onError = jest.fn()
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce(null)
        ;(hasSeenOnboarding as jest.Mock).mockResolvedValueOnce(true)
        ;(getNativeGoogleIdToken as jest.Mock).mockResolvedValueOnce('native-id-token')
        ;(authApi.googleIdToken as jest.Mock).mockResolvedValueOnce({
            data: {
                data: {
                    accessToken: 'access-native',
                    refreshToken: 'refresh-native',
                    user: { id: '1', email: 'user@test.dev', name: 'User', image: null, role: 'USER' },
                },
            },
        })

        const { setTokens } = require('../tokenStore')
        const { getByText } = render(
            <AuthProvider>
                <GoogleSignInTrigger onError={onError} />
            </AuthProvider>
        )

        fireEvent.press(getByText('Google'))

        await waitFor(() => {
            expect(authApi.googleIdToken).toHaveBeenCalledWith('native-id-token')
            expect(setTokens).toHaveBeenCalledWith('access-native', 'refresh-native')
        })
        expect(onError).not.toHaveBeenCalled()
    })

    it('signs out locally, clears tokens, and revokes refresh token', async () => {
        const onError = jest.fn()
        ;(getRefreshToken as jest.Mock).mockResolvedValue('refresh-signout')
        ;(authApi.logout as jest.Mock).mockResolvedValue(undefined)
        ;(refreshStoredSession as jest.Mock).mockResolvedValueOnce({
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            user: { id: '1', email: 'a@b.com', name: 'A', image: null, role: 'USER' },
        })

        const { clearTokens } = require('../tokenStore')
        const { getByText } = render(
            <AuthProvider>
                <SignOutTrigger onError={onError} />
            </AuthProvider>
        )

        await waitFor(() => {
            expect(router.replace).toHaveBeenCalledWith('/(tabs)')
        })

        fireEvent.press(getByText('SignOut'))

        await waitFor(() => {
            expect(clearTokens).toHaveBeenCalled()
            expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-in')
            expect(authApi.logout).toHaveBeenCalledWith('refresh-signout')
        })
        expect(onError).not.toHaveBeenCalled()
    })
})
