import { logger, serializeError } from '@/lib/logger'

/**
 * Optional error-tracking hook (e.g. Sentry). Register once at startup:
 *
 *   setErrorReporter((error, context) => Sentry.captureException(error, { tags: { context } }))
 *
 * The reporter must never throw; failures inside it are swallowed.
 */
export type ErrorReporter = (error: unknown, context: string, extra?: Record<string, unknown>) => void

let reporter: ErrorReporter | null = null

export function setErrorReporter(fn: ErrorReporter | null): void {
    reporter = fn
}

/**
 * Report a handled-but-unexpected error. Logs in every environment:
 * - server: structured JSON line via the logger
 * - browser: a lightweight console.error (visible in production devtools / RUM tools)
 * and forwards to the registered error reporter, if any.
 */
export function reportError(error: unknown, context: string, extra?: Record<string, unknown>): void {
    if (typeof window === 'undefined') {
        logger.error('reportError', { context, error: serializeError(error), ...extra })
    } else {
        console.error(`[${context}]`, error)
    }

    forwardToErrorReporter(error, context, extra)
}

/** Forward to the registered reporter only (for callers that already logged). */
export function forwardToErrorReporter(error: unknown, context: string, extra?: Record<string, unknown>): void {
    if (!reporter) return
    try {
        reporter(error, context, extra)
    } catch {
        // never let error reporting break the caller
    }
}
