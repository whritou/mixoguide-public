import type { ReactNode } from 'react'
import { guardUser } from '@/lib/auth/guards'
import { AppShell } from '@/components/layout/AppShell'

export default async function UserLayout({ children }: { children: ReactNode }) {
    const session = await guardUser()

    return (
        <AppShell session={session} mainClassName="pb-24 md:pb-0">
            {children}
        </AppShell>
    )
}
