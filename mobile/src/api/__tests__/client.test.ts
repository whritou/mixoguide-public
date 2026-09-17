import { setIsSignedOut } from '../client'

jest.mock('expo-constants', () => ({
    default: { expoConfig: { extra: { apiBaseUrl: 'https://mixoguide.com' }, hostUri: undefined } },
}))
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
jest.mock('@/auth/tokenStore', () => ({
    getAccessToken:      jest.fn(() => Promise.resolve('access-token')),
    getRefreshToken:     jest.fn(() => Promise.resolve('refresh-token')),
    setTokens:           jest.fn(() => Promise.resolve()),
    clearTokens:         jest.fn(() => Promise.resolve()),
    getOrCreateDeviceId: jest.fn(() => Promise.resolve('device-id')),
}))
jest.mock('@/store/networkStore', () => ({
    useNetworkStore: { getState: () => ({ setOnline: jest.fn() }) },
}))
jest.mock('@/store/toastStore', () => ({ showToast: jest.fn() }))

import axios, { type InternalAxiosRequestConfig } from 'axios'
import { api, authEvents } from '../client'
import { getRefreshToken, clearTokens } from '@/auth/tokenStore'

type RejectedInterceptor = (error: unknown) => Promise<unknown>
type ResponseInterceptorManager = { handlers: { rejected: RejectedInterceptor }[] }

describe('401 interceptor', () => {
    afterEach(() => {
        setIsSignedOut(false)
        jest.clearAllMocks()
        jest.restoreAllMocks()
    })

    it('emits signedOut and clears tokens when refresh fails', async () => {
        ;(getRefreshToken as jest.Mock).mockResolvedValueOnce(null)

        const signedOutHandler = jest.fn()
        const unsub = authEvents.on('signedOut', signedOutHandler)
        const requestConfig = { headers: axios.defaults.headers } as unknown as InternalAxiosRequestConfig
        const responseInterceptors = api.interceptors.response as unknown as ResponseInterceptorManager

        const error = new axios.AxiosError('Unauthorized', '401', undefined, undefined, {
            status: 401,
            data: {},
            headers: {},
            config: requestConfig,
            statusText: 'Unauthorized',
        })

        try {
            await responseInterceptors.handlers[0].rejected({
                ...error,
                config: { _retry: false, headers: {} },
                response: { status: 401 },
            })
        } catch {
            // expected
        }

        expect(clearTokens).toHaveBeenCalled()
        expect(signedOutHandler).toHaveBeenCalled()
        unsub()
    })

    it('skips refresh when isSignedOut flag is set', async () => {
        setIsSignedOut(true)

        const signedOutHandler = jest.fn()
        const unsub = authEvents.on('signedOut', signedOutHandler)
        const responseInterceptors = api.interceptors.response as unknown as ResponseInterceptorManager

        try {
            await responseInterceptors.handlers[0].rejected({
                config: { _retry: false, headers: {} },
                response: { status: 401 },
            })
        } catch {
            // expected — falls through to throw
        }

        expect(clearTokens).not.toHaveBeenCalled()
        expect(signedOutHandler).not.toHaveBeenCalled()
        unsub()
    })

    it('keeps tokens when refresh fails for a temporary server error', async () => {
        jest.spyOn(axios, 'post').mockRejectedValueOnce(
            Object.assign(new Error('Server unavailable'), { response: { status: 500 } })
        )

        const signedOutHandler = jest.fn()
        const unsub = authEvents.on('signedOut', signedOutHandler)
        const responseInterceptors = api.interceptors.response as unknown as ResponseInterceptorManager

        try {
            await responseInterceptors.handlers[0].rejected({
                config: { _retry: false, headers: {} },
                response: { status: 401 },
            })
        } catch {
            // expected
        }

        expect(clearTokens).not.toHaveBeenCalled()
        expect(signedOutHandler).not.toHaveBeenCalled()
        unsub()
    })
})
