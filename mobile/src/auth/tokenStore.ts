import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import { MMKV } from 'react-native-mmkv'

const KEYS = {
    ACCESS: 'mg_access_token',
    REFRESH: 'mg_refresh_token',
    DEVICE: 'mg_device_id',
    ONBOARDED: 'mg_onboarded',
    FEATURE_TOUR: 'mg_feature_tour_complete',
    FEATURE_TOUR_V2: 'mg_feature_tour_v2_complete',
    BIOMETRIC: 'mg_biometric_enabled',
} as const

const installStorage = new MMKV({ id: 'mg_install_state' })

export async function getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS)
}

export async function getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH)
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
        SecureStore.setItemAsync(KEYS.ACCESS, accessToken),
        SecureStore.setItemAsync(KEYS.REFRESH, refreshToken),
    ])
}

export async function clearTokens(): Promise<void> {
    await Promise.all([
        SecureStore.deleteItemAsync(KEYS.ACCESS),
        SecureStore.deleteItemAsync(KEYS.REFRESH),
    ])
}

export async function getOrCreateDeviceId(): Promise<string> {
    const existing = await SecureStore.getItemAsync(KEYS.DEVICE)
    if (existing) return existing

    const id = Crypto.randomUUID()
    await SecureStore.setItemAsync(KEYS.DEVICE, id)
    return id
}

export async function hasSeenOnboarding(): Promise<boolean> {
    return installStorage.getString(KEYS.ONBOARDED) === 'true'
}

export async function markOnboardingComplete(): Promise<void> {
    installStorage.set(KEYS.ONBOARDED, 'true')
}

export async function hasCompletedFeatureTour(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(KEYS.FEATURE_TOUR)
    return value === 'true'
}

export async function markFeatureTourComplete(): Promise<void> {
    await SecureStore.setItemAsync(KEYS.FEATURE_TOUR, 'true')
}

export async function hasCompletedFeatureTourV2(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(KEYS.FEATURE_TOUR_V2)
    return value === 'true'
}

export async function markFeatureTourV2Complete(): Promise<void> {
    await SecureStore.setItemAsync(KEYS.FEATURE_TOUR_V2, 'true')
}

export async function getBiometricEnabled(): Promise<boolean> {
    return (await SecureStore.getItemAsync(KEYS.BIOMETRIC)) === 'true'
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(KEYS.BIOMETRIC, enabled ? 'true' : 'false')
}
