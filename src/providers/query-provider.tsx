'use client'

import dynamic from 'next/dynamic'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'

type QueryDevtoolsProps = {
    initialIsOpen?: boolean
    buttonPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

const ReactQueryDevtools = (
    process.env.NODE_ENV === 'development'
        ? dynamic(
              () => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
              { ssr: false }
          )
        : (() => null)
) as React.ComponentType<QueryDevtoolsProps>

interface QueryProviderProps {
    children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
    const queryClient = getQueryClient()

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </QueryClientProvider>
    )
}
