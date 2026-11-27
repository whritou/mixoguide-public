import { afterEach, describe, expect, it, vi } from 'vitest'
import { withErrorHandler, REQUEST_ID_HEADER } from '@/middlewares/withErrorHandler'
import { BadRequestError } from '@/utils/errors'
import { setErrorReporter } from '@/utils/reportError'
import { jsonBody, nextRequest, routeContext } from '../../factories/auth'

function parseLogLine(call: unknown[]): Record<string, unknown> {
    return JSON.parse(String(call[0])) as Record<string, unknown>
}

describe('withErrorHandler', () => {
    afterEach(() => setErrorReporter(null))

    it('logs sanitized structured error details and returns a generic 500 for unknown errors', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const err = Object.assign(new Error('database exploded'), {
            password: 'do-not-log',
        })

        const handler = withErrorHandler(async () => {
            throw err
        })

        const response = await handler(
            nextRequest({ method: 'POST', path: '/api/test' }),
            routeContext(),
        )
        const body = await jsonBody<{ error: { message: string; code: string } }>(response)

        expect(response.status).toBe(500)
        expect(body.error).toEqual({
            message: 'Internal server error',
            code:    'INTERNAL_ERROR',
        })

        expect(consoleSpy).toHaveBeenCalledTimes(1)
        const logPayload = parseLogLine(consoleSpy.mock.calls[0])
        expect(logPayload).toMatchObject({
            level:  'error',
            msg:    'api.error',
            method: 'POST',
            path:   '/api/test',
            error:  {
                name:    'Error',
                message: 'database exploded',
            },
        })
        expect(typeof logPayload.requestId).toBe('string')
        expect(logPayload).not.toHaveProperty('password')
        expect(logPayload.error).not.toHaveProperty('password')
        expect(JSON.stringify(logPayload)).not.toContain('do-not-log')
    })

    it('maps application errors to their configured status and code', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)

        const handler = withErrorHandler(async () => {
            throw new BadRequestError('No garnish left')
        })

        const response = await handler(nextRequest({ path: '/api/test' }), routeContext())
        const body = await jsonBody<{ error: { message: string; code: string } }>(response)

        expect(response.status).toBe(400)
        expect(body.error).toEqual({
            message: 'No garnish left',
            code:    'BAD_REQUEST',
        })
    })

    it('propagates a valid incoming x-request-id to the response and logs', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const handler = withErrorHandler(async () => {
            throw new Error('boom')
        })

        const response = await handler(
            nextRequest({ path: '/api/test', headers: { [REQUEST_ID_HEADER]: 'req-abc-123' } }),
            routeContext(),
        )

        expect(response.headers.get(REQUEST_ID_HEADER)).toBe('req-abc-123')
        expect(parseLogLine(consoleSpy.mock.calls[0]).requestId).toBe('req-abc-123')
    })

    it('generates a request id when none (or a malformed one) is supplied', async () => {
        const handler = withErrorHandler(async () => Response.json({ ok: true }))

        const plain = await handler(nextRequest({ path: '/api/test' }), routeContext())
        const malformed = await handler(
            nextRequest({ path: '/api/test', headers: { [REQUEST_ID_HEADER]: 'bad id with spaces' } }),
            routeContext(),
        )

        expect(plain.headers.get(REQUEST_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/)
        expect(malformed.headers.get(REQUEST_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/)
    })

    it('sets the request id even on responses with immutable headers', async () => {
        const handler = withErrorHandler(async () => Response.redirect('https://example.com/', 302))

        const response = await handler(nextRequest({ path: '/api/test' }), routeContext())

        expect(response.status).toBe(302)
        expect(response.headers.get(REQUEST_ID_HEADER)).toBeTruthy()
        expect(response.headers.get('location')).toBe('https://example.com/')
    })

    it('forwards unexpected errors (not 4xx) to the registered error reporter', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const reporter = vi.fn()
        setErrorReporter(reporter)

        await withErrorHandler(async () => { throw new Error('boom') })(nextRequest({ path: '/api/a' }), routeContext())
        await withErrorHandler(async () => { throw new BadRequestError('nope') })(nextRequest({ path: '/api/b' }), routeContext())

        expect(reporter).toHaveBeenCalledTimes(1)
        expect(reporter.mock.calls[0][1]).toBe('api')
        expect(reporter.mock.calls[0][2]).toMatchObject({ path: '/api/a' })
    })
})
