import { getServerSession } from 'next-auth'

import { options } from '@/lib/auth/authOptions'
import { HeroSection } from '@/components/home/homepage/HeroSection'
import { InstagramHomepageBanner } from '@/components/home/homepage/InstagramHomepageBanner'
import { KpiDashboard } from '@/components/home/homepage/KpiDashboard'
import { HomePageBody } from '@/components/home/homepage/HomePageBody'
import { TonightDashboard } from '@/components/home/dashboard/TonightDashboard'
import { MobileTopSearchBar } from '@/components/home/MobileTopSearchBar'

export default async function Home() {
    const session = await getServerSession(options)
    const isAuthenticated = !!session?.user

    if (isAuthenticated) {
        return <TonightDashboard />
    }

    return (
        <div className="bg-mg-cream text-mg-ink min-h-screen">
            <MobileTopSearchBar />
            <HeroSection/>
            <KpiDashboard/>
            <InstagramHomepageBanner />
            <HomePageBody/>
        </div>
    )
}
