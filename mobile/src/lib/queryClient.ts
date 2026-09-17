import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { captureException } from '@/lib/sentry'
import { isApiNetworkError } from '@/api/errors'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime:            1000 * 60 * 5,
            retry:                (failureCount, error: unknown) => {
                const status = axios.isAxiosError(error) ? error.response?.status : undefined
                if (status && status < 500 && status !== 429) return false
                return failureCount < 2
            },
            refetchOnWindowFocus: false,
        },
        mutations: {
            onError: (error: unknown) => {
                if (isApiNetworkError(error)) return

                const status = axios.isAxiosError(error) ? error.response?.status : undefined
                if (!status || status >= 500) {
                    captureException(error)
                }
            },
        },
    },
})
