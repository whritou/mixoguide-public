import { describe, expect, it, vi } from 'vitest'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { BadRequestError } from '@/utils/errors'
import { jsonBody, nextRequest, routeContext } from '../../factories/auth'

describe('withErrorHandler', () => {
    it('logs sanitized error details and returns a generic 500 for unknown errors', async () => {
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

        const [, logPayload] = consoleSpy.mock.calls[0]
        expect(logPayload).toMatchObject({
            method: 'POST',
            path:   '/api/test',
            error:  {
                name:    'Error',
                message: 'database exploded',
            },
        })
        expect(logPayload).not.toHaveProperty('password')
        expect((logPayload as { error: Record<string, unknown> }).error).not.toHaveProperty('password')
    })

    it('maps application errors to their configured status and code', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)

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
})
