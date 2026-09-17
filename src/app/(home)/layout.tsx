"use client"

import AppBar from "@/components/layout/Appbar"
import "./../globals.css";
import { Footer } from "@/components/layout/Footer"
export default function HomeLayout({ children }: { children: React.ReactNode }) {

  return (
      <>
        <AppBar />
        <main className="pt-0 md:pt-[72px]">
          {children}
        </main>
        <Footer />
      </>
  )
}
