const fs = require('fs')
const path = require('path')

const TEST_ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713'
const TEST_ADMOB_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511'

const explicitUseTestAds = process.env.EXPO_PUBLIC_ADMOB_USE_TEST_ADS
const useTestAds = explicitUseTestAds == null
    ? process.env.EAS_BUILD_PROFILE !== 'production'
    : explicitUseTestAds !== 'false'

const androidAppId = process.env.ADMOB_ANDROID_APP_ID || TEST_ADMOB_ANDROID_APP_ID
const iosAppId = process.env.ADMOB_IOS_APP_ID || TEST_ADMOB_IOS_APP_ID
const androidBannerUnitId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID || ''
const iosBannerUnitId = process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID || ''
const googleServicesWebClientId = readGoogleServicesWebClientId()
const envGoogleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''
const googleWebClientId = envGoogleWebClientId || googleServicesWebClientId || ''

if (!useTestAds && (!process.env.ADMOB_ANDROID_APP_ID || !androidBannerUnitId)) {
    throw new Error(
        'Production AdMob builds require ADMOB_ANDROID_APP_ID and EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID.',
    )
}

if (envGoogleWebClientId && googleServicesWebClientId && envGoogleWebClientId !== googleServicesWebClientId) {
    throw new Error(
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID does not match the Web OAuth client in google-services.json.',
    )
}

function readGoogleServicesWebClientId() {
    try {
        const filePath = path.join(__dirname, 'google-services.json')
        const googleServices = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        const clients = googleServices.client?.[0]?.oauth_client
        const webClient = Array.isArray(clients)
            ? clients.find(client => client.client_type === 3)
            : null

        return typeof webClient?.client_id === 'string' ? webClient.client_id : ''
    } catch {
        return ''
    }
}

function withGoogleMobileAdsPlugin(plugins = []) {
    const pluginConfig = [
        'react-native-google-mobile-ads',
        {
            androidAppId,
            iosAppId,
        },
    ]

    const withoutExisting = plugins.filter(plugin => {
        if (plugin === 'react-native-google-mobile-ads') return false
        return !(Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads')
    })

    return [...withoutExisting, pluginConfig]
}

function withGoogleSignInPlugin(plugins = []) {
    const hasPlugin = plugins.some(plugin => {
        if (plugin === '@react-native-google-signin/google-signin') return true
        return Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin'
    })

    return hasPlugin ? plugins : [...plugins, '@react-native-google-signin/google-signin']
}

module.exports = ({ config }) => ({
    ...config,
    plugins: withGoogleMobileAdsPlugin(withGoogleSignInPlugin(config.plugins)),
    extra: {
        ...config.extra,
        googleWebClientId: googleWebClientId || config.extra?.googleWebClientId || '',
        admob: {
            useTestAds,
            androidBannerUnitId,
            iosBannerUnitId,
        },
    },
})
