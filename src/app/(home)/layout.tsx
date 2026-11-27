import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'

/**
 * Public catalog/landing shell. Deliberately does not read the session on the
 * server so catalog pages can stay static; the client provider resolves it.
 */
export default function HomeLayout({ children }: { children: ReactNode }) {
    return <AppShell>{children}</AppShell>
}
