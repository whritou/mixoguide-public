import { QueryClient, isServer } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/fetcher'

/** Client errors (except timeout / rate limit) are deterministic: retrying only adds latency. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
    if (error instanceof ApiError) {
        const { status } = error
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) return false
    }
    return failureCount < 2
}

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60_000,
                gcTime: 5 * 60_000,
                refetchOnWindowFocus: false,
                retry: shouldRetryQuery,
            },
            mutations: {
                retry: false,
            },
        },
    })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
    if (isServer) return makeQueryClient()
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
}
