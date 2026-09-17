import { QueryClient, isServer } from '@tanstack/react-query'

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60_000,
                gcTime: 5 * 60_000,
                refetchOnWindowFocus: false,
                retry: (failureCount, error) => {
                    if (error instanceof Error && error.message.includes('401')) return false
                    return failureCount < 2
                },
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
