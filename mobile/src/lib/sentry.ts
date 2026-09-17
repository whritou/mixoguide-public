import * as Sentry from '@sentry/react-native'
import { isApiNetworkError } from '@/api/errors'

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-device-id', 'x-csrf-token']
const SENSITIVE_QUERY_PARAMS = ['token', 'code', 'state', 'codeVerifier', 'access_token', 'refresh_token']
const SENSITIVE_BODY_KEYS = ['password', 'passwordConfirm', 'currentPassword', 'newPassword', 'token', 'refreshToken', 'accessToken', 'codeVerifier']

function scrubUrl(url: string | undefined): string | undefined {
    if (!url) return url
    try {
        const u = new URL(url)
        for (const key of SENSITIVE_QUERY_PARAMS) {
            if (u.searchParams.has(key)) u.searchParams.set(key, '[Filtered]')
        }
        return u.toString()
    } catch {
        return url
    }
}

function scrubObject(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj
    const copy: Record<string, unknown> = Array.isArray(obj) ? ([...obj] as unknown as Record<string, unknown>) : { ...(obj as Record<string, unknown>) }
    for (const key of Object.keys(copy)) {
        if (SENSITIVE_BODY_KEYS.includes(key)) {
            copy[key] = '[Filtered]'
        } else if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
            copy[key] = '[Filtered]'
        } else if (typeof copy[key] === 'object') {
            copy[key] = scrubObject(copy[key])
        }
    }
    return copy
}

export function initSentry() {
    if (!DSN) {
        if (__DEV__) console.warn('[sentry] DSN not set; skipping init')
        return
    }
    Sentry.init({
        dsn: DSN,
        enableAutoSessionTracking: true,
        tracesSampleRate: __DEV__ ? 1.0 : 0.1,
        debug: __DEV__,
        sendDefaultPii: false,
        beforeSend(event) {
            if (event.request) {
                event.request.url = scrubUrl(event.request.url)
                event.request.headers = scrubObject(event.request.headers) as Record<string, string> | undefined
                event.request.data = scrubObject(event.request.data)
                event.request.query_string = undefined
            }
            if (event.user) {
                delete event.user.email
                delete event.user.ip_address
            }
            if (event.extra) event.extra = scrubObject(event.extra) as Record<string, unknown>
            return event
        },
        beforeBreadcrumb(breadcrumb) {
            if (breadcrumb.category === 'navigation' || breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
                if (breadcrumb.data?.url) breadcrumb.data.url = scrubUrl(String(breadcrumb.data.url))
                if (breadcrumb.data?.to) breadcrumb.data.to = scrubUrl(String(breadcrumb.data.to))
                if (breadcrumb.data?.from) breadcrumb.data.from = scrubUrl(String(breadcrumb.data.from))
            }
            return breadcrumb
        },
    })
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
    if (isApiNetworkError(error)) return

    if (__DEV__) console.error('[Error]', error, context)
    if (DSN) Sentry.captureException(error, context ? { extra: scrubObject(context) as Record<string, unknown> } : undefined)
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (__DEV__) console.warn(`[${level.toUpperCase()}]`, message)
    if (DSN) Sentry.captureMessage(message, level)
}

export const wrap = Sentry.wrap
