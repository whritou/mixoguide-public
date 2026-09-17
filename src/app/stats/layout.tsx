import { guardUser } from '@/lib/auth/guards'
import AppBar from '@/components/layout/Appbar'
import '../globals.css'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
    title: 'My Stats — MixoGuide',
    description: 'Your personal cocktail-making history: streaks, trends, and favourites.',
}

export default async function StatsLayout({ children }: { children: ReactNode }) {
    await guardUser()
    return (
        <>
            <AppBar />
            <main className="pt-0 md:pt-[72px] pb-24 md:pb-0">{children}</main>
            <Footer />
        </>
    )
}
