import axios from 'axios'

const mockCaptureException = jest.fn()
const mockCaptureMessage = jest.fn()

jest.mock('@sentry/react-native', () => ({
    captureException: mockCaptureException,
    captureMessage:   mockCaptureMessage,
    init:             jest.fn(),
    wrap:             (component: unknown) => component,
}))

describe('captureException', () => {
    const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN
    let consoleError: jest.SpyInstance

    beforeEach(() => {
        jest.resetModules()
        jest.clearAllMocks()
        process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.com/1'
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
        process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn
        consoleError.mockRestore()
    })

    it('does not report Axios network errors', () => {
        jest.isolateModules(() => {
            const { captureException } = require('../sentry') as typeof import('../sentry')
            const error = new axios.AxiosError('Network Error', 'ERR_NETWORK')

            captureException(error)
        })

        expect(mockCaptureException).not.toHaveBeenCalled()
    })

    it('reports non-network errors', () => {
        jest.isolateModules(() => {
            const { captureException } = require('../sentry') as typeof import('../sentry')
            const error = new Error('Unexpected failure')

            captureException(error)
        })

        expect(mockCaptureException).toHaveBeenCalledWith(new Error('Unexpected failure'), undefined)
    })
})
