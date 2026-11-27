import { getServerSession } from 'next-auth'

import { options } from '@/lib/auth/authOptions'
import { TonightDashboard } from '@/components/home/dashboard/TonightDashboard'
import { DemoBarImporter } from '@/components/home/DemoBarImporter'
import { decodeBarParam } from '@/lib/demo-bar/bar-param'
import { LandingPage } from '@/components/home/landing/LandingPage'

export default async function Home({ searchParams }: { searchParams: Promise<{ bar?: string | string[] }> }) {
    const session = await getServerSession(options)
    const isAuthenticated = !!session?.user

    if (isAuthenticated) {
        return (
            <>
                <DemoBarImporter />
                <TonightDashboard />
            </>
        )
    }

    const { bar } = await searchParams
    const sharedIds = decodeBarParam(Array.isArray(bar) ? bar[0] : bar)

    return <LandingPage sharedIds={sharedIds} />
}
