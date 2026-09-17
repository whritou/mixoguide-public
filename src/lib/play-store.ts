export const PLAY_STORE_PACKAGE = 'com.mixoguide.app'
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`

const ANDROID_RE = /Android/i
const MOBILE_RE = /Mobile|Tablet|Silk|Kindle/i

export function isAndroidMobileUserAgent(userAgent: string): boolean {
    return ANDROID_RE.test(userAgent) && MOBILE_RE.test(userAgent)
}
