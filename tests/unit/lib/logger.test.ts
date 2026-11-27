import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger, serializeError } from '@/lib/logger'
import { reportError, setErrorReporter } from '@/utils/reportError'

describe('logger', () => {
    afterEach(() => {
        delete process.env.LOG_LEVEL
    })

    it('writes one JSON line with level, msg, ts and context', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        logger.error('something.failed', { requestId: 'r-1', userId: 'u-1' })

        const entry = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>
        expect(entry).toMatchObject({ level: 'error', msg: 'something.failed', requestId: 'r-1', userId: 'u-1' })
        expect(typeof entry.ts).toBe('string')
    })

    it('child loggers merge bindings', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

        logger.child({ requestId: 'r-2' }).warn('x', { a: 1 })

        expect(JSON.parse(String(spy.mock.calls[0][0]))).toMatchObject({ requestId: 'r-2', a: 1, level: 'warn' })
    })

    it('respects LOG_LEVEL', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        process.env.LOG_LEVEL = 'error'
        logger.info('hidden')
        expect(log).not.toHaveBeenCalled()

        process.env.LOG_LEVEL = 'debug'
        logger.debug('shown')
        expect(log).toHaveBeenCalledTimes(1)
    })

    it('serializes errors and survives circular context', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const circular: Record<string, unknown> = { name: 'c' }
        circular.self = circular

        logger.error('circ', { circular, err: new Error('inner') })

        const entry = JSON.parse(String(spy.mock.calls[0][0])) as { circular: { self: string }; err: { message: string } }
        expect(entry.circular.self).toBe('[Circular]')
        expect(entry.err.message).toBe('inner')
    })

    it('serializeError handles non-Error values', () => {
        expect(serializeError('oops')).toEqual({ name: 'UnknownError', message: 'oops' })
    })
})

describe('reportError', () => {
    afterEach(() => setErrorReporter(null))

    it('logs in every environment and forwards to the registered reporter', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const reporter = vi.fn()
        setErrorReporter(reporter)
        const err = new Error('mail down')

        reportError(err, 'suggestion.sendNotification', { suggestionId: 's1' })

        expect(JSON.parse(String(spy.mock.calls[0][0]))).toMatchObject({
            level: 'error',
            msg: 'reportError',
            context: 'suggestion.sendNotification',
            suggestionId: 's1',
            error: { message: 'mail down' },
        })
        expect(reporter).toHaveBeenCalledWith(err, 'suggestion.sendNotification', { suggestionId: 's1' })
    })

    it('never throws when the reporter throws', () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        setErrorReporter(() => { throw new Error('sentry down') })

        expect(() => reportError(new Error('x'), 'ctx')).not.toThrow()
    })
})
