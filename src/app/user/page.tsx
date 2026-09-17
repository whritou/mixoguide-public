'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart2 } from 'lucide-react'
import { ProfileHeader }       from '@/components/user/ProfileHeader'
import { StatsRow }            from '@/components/user/StatsRow'
import { EditProfileSection }  from '@/components/user/EditProfileSection'
import { ChangePasswordSection } from '@/components/user/ChangePasswordSection'
import { DangerZone }          from '@/components/user/DangerZone'
import { PageSkeleton }        from '@/components/user/PageSkeleton'
import type { ProfileData }    from '@/components/user/types'

export default function UserPage() {
    const [profile,  setProfile] = useState<ProfileData | null>(null)
    const [loading, setLoading]  = useState(true)

    useEffect(() => {
        fetch('/api/user/me/profile')
            .then(async (r) => {
                if (!r.ok) { setLoading(false); return }
                const text = await r.text()
                if (!text) { setLoading(false); return }
                const d = JSON.parse(text)
                const profileData = d.data ?? d
                setProfile({ ...profileData, hasPassword: profileData.hasPassword ?? false } as ProfileData)
            })
            .catch(() => setLoading(false))
            .finally(() => setLoading(false))
    }, [])

    if (loading)  return <PageSkeleton />
    if (!profile) return null

    return (
        <div className="bg-mg-cream min-h-screen px-4 my-10 md:px-12 py-12 max-w-3xl mx-auto space-y-8">
            <ProfileHeader profile={profile} onUpdate={setProfile} />
            <StatsRow stats={profile.stats} />
            <Link
                href="/stats"
                className="flex items-center gap-2 text-xs text-mg-muted hover:text-mg-brown transition-colors w-fit -mt-4"
            >
                <BarChart2 size={13} />
                View your drink history &amp; streaks
            </Link>
            <EditProfileSection profile={profile} onUpdate={setProfile} />
            {profile.hasPassword && <ChangePasswordSection />}
            <DangerZone hasPassword={profile.hasPassword} />
        </div>
    )
}
