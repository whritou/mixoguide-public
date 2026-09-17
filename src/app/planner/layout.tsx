import { guardUser } from '@/lib/auth/guards'
import AppBar from '@/components/layout/Appbar'
import './../globals.css'
import type { ReactNode } from 'react'
import { Footer } from "@/components/layout/Footer"

export default async function PlannerLayout({ children }: { children: ReactNode }) {
  await guardUser()

  return (
    <>
        <AppBar />
            <main className="pt-0 md:pt-[72px] pb-24 md:pb-0">
                {children}
            </main>
        <Footer />
    </>
  )
}
