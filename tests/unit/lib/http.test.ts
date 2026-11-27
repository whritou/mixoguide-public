import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithTimeout, FetchTimeoutError, DEFAULT_FETCH_TIMEOUT_MS } from '@/lib/http'

/** A fetch mock that never resolves on its own, only rejects when its signal aborts. */
function hangingFetch() {
    return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
        const signal = init?.signal
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
    }))
}

describe('fetchWithTimeout', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('defaults to a 4 s timeout', () => {
        expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(4000)
    })

    it('returns the response when fetch resolves in time and passes init through', async () => {
        const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)

        const res = await fetchWithTimeout('https://example.com/a', { method: 'POST', headers: { a: '1' } }, 1000)

        expect(await res.text()).toBe('ok')
        const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
        expect(init.method).toBe('POST')
        expect(init.headers).toEqual({ a: '1' })
        expect(init.signal).toBeInstanceOf(AbortSignal)
    })

    it('rejects with FetchTimeoutError when the request hangs past the timeout', async () => {
        vi.stubGlobal('fetch', hangingFetch())

        const err = await fetchWithTimeout('https://example.com/slow', {}, 20).catch((e: unknown) => e)

        expect(err).toBeInstanceOf(FetchTimeoutError)
        expect((err as FetchTimeoutError).url).toBe('https://example.com/slow')
        expect((err as FetchTimeoutError).timeoutMs).toBe(20)
    })

    it('honours a caller-provided signal (caller abort is not reported as a timeout)', async () => {
        vi.stubGlobal('fetch', hangingFetch())
        const controller = new AbortController()

        const pending = fetchWithTimeout(new URL('https://example.com/b'), { signal: controller.signal }, 10_000)
        controller.abort(new Error('caller cancelled'))

        await expect(pending).rejects.toThrow('caller cancelled')
        await expect(pending).rejects.not.toBeInstanceOf(FetchTimeoutError)
    })

    it('propagates network errors unchanged', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))

        await expect(fetchWithTimeout('https://example.com/c')).rejects.toThrow(TypeError)
    })
})
