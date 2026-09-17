import axios from 'axios'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { getAccessToken, getRefreshToken, setTokens, clearTokens, getOrCreateDeviceId } from '@/auth/tokenStore'
import { getApiStatus } from '@/api/errors'
import { useNetworkStore } from '@/store/networkStore'
import { showToast } from '@/store/toastStore'

const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl

function getDevApiBaseUrl(): string | null {
    const hostUri = Constants.expoConfig?.hostUri
    if (!hostUri) return null

    const hostWithPort = hostUri.replace(/^[a-z]+:\/\//i, '').split('/')[0]
    const host = hostWithPort.startsWith('[')
        ? hostWithPort.slice(1, hostWithPort.indexOf(']'))
        : hostWithPort.split(':')[0]

    if (!host) return null

    const apiHost = Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')
        ? '10.0.2.2'
        : host

    return `http://${apiHost}:3000`
}

const BASE_URL = (__DEV__ ? getDevApiBaseUrl() : null)
    ?? (typeof configuredBaseUrl === 'string' ? configuredBaseUrl : null)
    ?? 'https://mixoguide.com'

export const API_BASE_URL = BASE_URL

if (__DEV__) {
    console.warn(`[api] baseURL: ${BASE_URL}`)
}

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
})

// Attach Bearer token and device id to every request
api.interceptors.request.use(async (config) => {
    const [token, deviceId] = await Promise.all([
        getAccessToken(),
        getOrCreateDeviceId(),
    ])
    if (token) config.headers.Authorization = `Bearer ${token}`
    config.headers['X-Device-Id'] = deviceId
    return config
})

// On 401 -> refresh once, then retry. Concurrent requests are queued.
type RefreshSessionResult = {
    accessToken: string
    refreshToken: string
    user?: {
        id: string
        email: string | null
        name: string | null
        image: string | null
        role: string
    }
}

type MissingRefreshTokenError = Error & { missingRefreshToken?: true }

let refreshPromise: Promise<RefreshSessionResult> | null = null
let isSignedOut = false

export function setIsSignedOut(value: boolean) {
    isSignedOut = value
}

function missingRefreshTokenError(): MissingRefreshTokenError {
    const err = new Error('No refresh token') as MissingRefreshTokenError
    err.missingRefreshToken = true
    return err
}

export function shouldClearTokensForRefreshError(error: unknown): boolean {
    if ((error as MissingRefreshTokenError | null)?.missingRefreshToken) return true
    const status = getApiStatus(error)
    return status === 401 || status === 403
}

async function requestSessionRefresh(): Promise<RefreshSessionResult> {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) throw missingRefreshTokenError()

    const deviceId = await getOrCreateDeviceId()
    const res = await axios.post(`${BASE_URL}/api/auth/mobile/refresh`, { refreshToken }, {
        headers: { 'X-Device-Id': deviceId },
    })

    const session = res.data.data as RefreshSessionResult
    await setTokens(session.accessToken, session.refreshToken)
    return session
}

export async function refreshStoredSession(): Promise<RefreshSessionResult> {
    refreshPromise ??= requestSessionRefresh()
    try {
        return await refreshPromise
    } finally {
        refreshPromise = null
    }
}

api.interceptors.response.use(
    (response) => {
        // A successful response means we're online
        useNetworkStore.getState().setOnline(true)
        return response
    },
    async (error) => {
        const original = error.config

        // Network error (no response) -> mark offline
        if (!error.response) {
            useNetworkStore.getState().setOnline(false)
            throw error
        }

        // Back online if we got any HTTP response
        useNetworkStore.getState().setOnline(true)

        if (error.response?.status === 401 && !original._retry && !isSignedOut) {
            original._retry = true
            try {
                const session = await refreshStoredSession()
                original.headers.Authorization = `Bearer ${session.accessToken}`
                return api(original)
            } catch (refreshError) {
                if (shouldClearTokensForRefreshError(refreshError)) {
                    isSignedOut = true
                    await clearTokens()
                    authEvents.emit('signedOut')
                }
                throw error
            }
        }

        // 429 Rate limit
        if (error.response?.status === 429) {
            showToast('Too many requests. Please slow down.', 'error')
        }

        // 5xx Server error
        if (error.response?.status >= 500) {
            showToast('Server error. Please try again later.', 'error')
        }

        throw error
    }
)

// Minimal event emitter so the API client can signal the AuthProvider
type AuthEvent = 'signedOut'
type Listener = () => void
const listeners = new Map<AuthEvent, Set<Listener>>()

export const authEvents = {
    emit(event: AuthEvent) {
        listeners.get(event)?.forEach((fn) => fn())
    },
    on(event: AuthEvent, fn: Listener) {
        if (!listeners.has(event)) listeners.set(event, new Set())
        listeners.get(event)!.add(fn)
        return () => listeners.get(event)?.delete(fn)
    },
}
