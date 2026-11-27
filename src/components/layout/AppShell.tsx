import type { ReactNode } from 'react'
import type { Session } from 'next-auth'
import AuthProvider from '@/components/AuthProvider'
import AppBar from '@/components/layout/Appbar'
import { Footer } from '@/components/layout/Footer'
import { cn } from '@/lib/utils'

interface AppShellProps {
    children: ReactNode
    /**
     * Server-resolved session for guarded layouts. Leave undefined on public
     * layouts so they are not forced into dynamic rendering.
     */
    session?: Session | null
    /** Extra classes for the `<main>` landmark (e.g. bottom padding for the mobile nav). */
    mainClassName?: string
}

/**
 * Shared server shell: app bar, the single `<main id="main">` landmark targeted
 * by the root skip link, and the footer. Pages rendered inside must not render
 * another `<main>`.
 */
export function AppShell({ children, session, mainClassName }: AppShellProps) {
    return (
        <AuthProvider session={session}>
            <AppBar />
            <main id="main" tabIndex={-1} className={cn('pt-0 md:pt-[72px] outline-none', mainClassName)}>
                {children}
            </main>
            <Footer />
        </AuthProvider>
    )
}
