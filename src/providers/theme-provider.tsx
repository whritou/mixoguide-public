'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { isDarkModeAvailable } from '@/lib/env'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            forcedTheme={isDarkModeAvailable() ? undefined : 'light'}
        >
            {children}
        </NextThemesProvider>
    )
}
