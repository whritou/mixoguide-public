/** Default timeout for outbound HTTP calls (third-party APIs). */
export const DEFAULT_FETCH_TIMEOUT_MS = 4000

export class FetchTimeoutError extends Error {
    constructor(public readonly url: string, public readonly timeoutMs: number) {
        super(`Request to ${url} timed out after ${timeoutMs}ms`)
        this.name = 'FetchTimeoutError'
    }
}

function describeInput(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input
    if (input instanceof URL) return input.toString()
    return input.url
}

/**
 * `fetch` with a hard timeout. Uses `AbortSignal.timeout(ms)` combined with any
 * caller-provided `init.signal` (whichever aborts first wins). A timeout rejects
 * with `FetchTimeoutError`; a caller abort rejects with the caller's reason.
 */
export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    ms: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
    const timeoutSignal = AbortSignal.timeout(ms)
    const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal

    try {
        return await fetch(input, { ...init, signal })
    } catch (err) {
        if (timeoutSignal.aborted && !init.signal?.aborted) {
            throw new FetchTimeoutError(describeInput(input), ms)
        }
        throw err
    }
}
