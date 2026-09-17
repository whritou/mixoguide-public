import * as SecureStore from 'expo-secure-store'
import { MMKV } from 'react-native-mmkv'
import {
    setTokens,
    clearTokens,
    getAccessToken,
    getRefreshToken,
    hasSeenOnboarding,
    markOnboardingComplete,
    hasCompletedFeatureTour,
    markFeatureTourComplete,
    getBiometricEnabled,
    setBiometricEnabled,
    getOrCreateDeviceId,
    hasCompletedFeatureTourV2,
    markFeatureTourV2Complete,
} from '../tokenStore'

jest.mock('expo-secure-store', () => {
    const store: Record<string, string> = {}
    return {
        getItemAsync: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
        setItemAsync: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve() }),
        deleteItemAsync: jest.fn((key: string) => { delete store[key]; return Promise.resolve() }),
    }
})

jest.mock('react-native-mmkv', () => {
    const store = new Map<string, string>()
    return {
        MMKV: jest.fn(() => ({
            getString: jest.fn((key: string) => store.get(key)),
            set:       jest.fn((key: string, value: string) => { store.set(key, value) }),
            clearAll:  jest.fn(() => { store.clear() }),
        })),
    }
})

jest.mock('expo-crypto', () => ({
    randomUUID: jest.fn(() => 'test-uuid-1234'),
}))

beforeEach(() => {
    jest.clearAllMocks()
    ;(MMKV as jest.Mock).mock.results[0]?.value.clearAll()
})

describe('setTokens / clearTokens', () => {
    it('stores access and refresh tokens', async () => {
        await setTokens('access-abc', 'refresh-xyz')
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('mg_access_token', 'access-abc')
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('mg_refresh_token', 'refresh-xyz')
    })

    it('reads back stored tokens', async () => {
        await setTokens('access-abc', 'refresh-xyz')
        ;(SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
            Promise.resolve(key === 'mg_access_token' ? 'access-abc' : key === 'mg_refresh_token' ? 'refresh-xyz' : null)
        )
        expect(await getAccessToken()).toBe('access-abc')
        expect(await getRefreshToken()).toBe('refresh-xyz')
    })

    it('clearTokens deletes both token keys', async () => {
        await clearTokens()
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('mg_access_token')
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('mg_refresh_token')
    })
})

describe('biometric setting', () => {
    it('defaults to false when key is absent', async () => {
        ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null)
        expect(await getBiometricEnabled()).toBe(false)
    })

    it('returns true after enabling', async () => {
        await setBiometricEnabled(true)
        ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('true')
        expect(await getBiometricEnabled()).toBe(true)
    })

    it('returns false after disabling', async () => {
        await setBiometricEnabled(false)
        ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('false')
        expect(await getBiometricEnabled()).toBe(false)
    })
})

describe('getOrCreateDeviceId', () => {
    it('creates a new device id when none exists', async () => {
        ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null)
        const id = await getOrCreateDeviceId()
        expect(id).toBe('test-uuid-1234')
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('mg_device_id', 'test-uuid-1234')
    })

    it('returns existing device id', async () => {
        ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('existing-device-id')
        const id = await getOrCreateDeviceId()
        expect(id).toBe('existing-device-id')
        expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('mg_device_id', expect.anything())
    })
})

describe('feature tour v2 flag', () => {
    it('defaults to incomplete and stores completion', async () => {
        ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null)
        expect(await hasCompletedFeatureTourV2()).toBe(false)

        await markFeatureTourV2Complete()
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('mg_feature_tour_v2_complete', 'true')

        ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('true')
        expect(await hasCompletedFeatureTourV2()).toBe(true)
    })
})

describe('onboarding and feature-tour v1 flags', () => {
    it('stores and reads onboarding completion in install-local storage', async () => {
        expect(await hasSeenOnboarding()).toBe(false)

        await markOnboardingComplete()
        expect(await hasSeenOnboarding()).toBe(true)
        expect(SecureStore.getItemAsync).not.toHaveBeenCalledWith('mg_onboarded')
        expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('mg_onboarded', 'true')
    })

    it('stores and reads feature tour v1 completion', async () => {
        ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null)
        expect(await hasCompletedFeatureTour()).toBe(false)

        await markFeatureTourComplete()
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('mg_feature_tour_complete', 'true')

        ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('true')
        expect(await hasCompletedFeatureTour()).toBe(true)
    })
})
