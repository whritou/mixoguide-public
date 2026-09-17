import Constants from 'expo-constants'
import type * as GoogleSignInModule from '@react-native-google-signin/google-signin'

const GOOGLE_SIGN_IN_CANCELLED = 'access_denied'
const GOOGLE_PLAY_SERVICES_NETWORK_ERROR_CODE = '7'
const GOOGLE_PLAY_SERVICES_NETWORK_ERROR_MESSAGE = 'NETWORK_ERROR'

let configuredWebClientId: string | null = null
let googleSignInModulePromise: Promise<typeof GoogleSignInModule> | null = null

function valueOf(error: unknown, key: string): unknown {
    return error && typeof error === 'object'
        ? (error as Record<string, unknown>)[key]
        : undefined
}

export function isGoogleNetworkError(error: unknown): boolean {
    const code = valueOf(error, 'code')
    const message = error instanceof Error ? error.message : valueOf(error, 'message')

    return code === GOOGLE_PLAY_SERVICES_NETWORK_ERROR_CODE
        || message === GOOGLE_PLAY_SERVICES_NETWORK_ERROR_MESSAGE
}

function googleWebClientId() {
    const value = Constants.expoConfig?.extra?.googleWebClientId
    return typeof value === 'string' && value.length > 0 ? value : null
}

function loadGoogleSignInModule() {
    googleSignInModulePromise ??= import('@react-native-google-signin/google-signin')
    return googleSignInModulePromise
}

function configureGoogleSignIn(
    GoogleSignin: typeof GoogleSignInModule.GoogleSignin,
    webClientId: string
) {
    if (configuredWebClientId === webClientId) return

    GoogleSignin.configure({
        webClientId,
        offlineAccess: false,
        scopes: ['email', 'profile'],
    })
    configuredWebClientId = webClientId
}

export async function getNativeGoogleIdToken(): Promise<string | null> {
    const webClientId = googleWebClientId()
    if (!webClientId) return null

    let module: typeof GoogleSignInModule
    try {
        module = await loadGoogleSignInModule()
    } catch {
        return null
    }

    const {
        GoogleSignin,
        isCancelledResponse,
        isSuccessResponse,
    } = module

    configureGoogleSignIn(GoogleSignin, webClientId)

    try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    } catch {
        return null
    }

    const response = await GoogleSignin.signIn()
    if (isCancelledResponse(response)) {
        throw new Error(GOOGLE_SIGN_IN_CANCELLED)
    }
    if (!isSuccessResponse(response)) {
        throw new Error('NATIVE_GOOGLE_SIGN_IN_FAILED')
    }

    if (response.data.idToken) return response.data.idToken

    const tokens = await GoogleSignin.getTokens()
    if (tokens.idToken) return tokens.idToken

    throw new Error('NATIVE_GOOGLE_NO_ID_TOKEN')
}
