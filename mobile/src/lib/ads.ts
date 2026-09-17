import Constants from 'expo-constants'
import { Platform } from 'react-native'

type AdMobExtra = {
    useTestAds?: boolean
    androidBannerUnitId?: string
    iosBannerUnitId?: string
}

type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads')

const admob = (Constants.expoConfig?.extra?.admob ?? {}) as AdMobExtra
const isExpoGo = Constants.appOwnership === 'expo'

let initializePromise: Promise<unknown> | null = null

function getGoogleMobileAdsModule(): GoogleMobileAdsModule | null {
    if (isExpoGo) return null

    try {
        return require('react-native-google-mobile-ads') as GoogleMobileAdsModule
    } catch {
        return null
    }
}

export function getBannerAdUnitId(): string | null {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null

    const adsModule = getGoogleMobileAdsModule()
    if (!adsModule) return null

    if (admob.useTestAds !== false) return adsModule.TestIds.BANNER

    const unitId = Platform.select({
        android: admob.androidBannerUnitId,
        ios: admob.iosBannerUnitId,
    })

    return unitId || null
}

export function initializeAds(): Promise<unknown> {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return Promise.resolve()

    const adsModule = getGoogleMobileAdsModule()
    if (!adsModule) return Promise.resolve()

    initializePromise ??= adsModule.default()
        .initialize()
        .catch(() => {
            initializePromise = null
        })

    return initializePromise
}
