import axios, { type InternalAxiosRequestConfig } from 'axios'
import { queryClient } from '../queryClient'
import { captureException } from '../sentry'

jest.mock('../sentry', () => ({
    captureException: jest.fn(),
}))

describe('queryClient error reporting', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('does not report Axios network errors from mutations', () => {
        const onError = queryClient.getDefaultOptions().mutations?.onError as ((error: unknown) => void) | undefined
        const error = new axios.AxiosError('Network Error', 'ERR_NETWORK')

        onError?.(error)

        expect(captureException).not.toHaveBeenCalled()
    })

    it('reports server errors from mutations', () => {
        const onError = queryClient.getDefaultOptions().mutations?.onError as ((error: unknown) => void) | undefined
        const responseConfig = { headers: new axios.AxiosHeaders() } as InternalAxiosRequestConfig
        const error = new axios.AxiosError('Server Error', 'ERR_BAD_RESPONSE', undefined, undefined, {
            status:     500,
            data:       {},
            headers:    {},
            config:     responseConfig,
            statusText: 'Internal Server Error',
        })

        onError?.(error)

        expect(captureException).toHaveBeenCalledWith(error)
    })
})
