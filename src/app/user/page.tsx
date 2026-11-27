'use client'

import Link from 'next/link'
import { BarChart2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { ProfileHeader }       from '@/components/user/ProfileHeader'
import { StatsRow }            from '@/components/user/StatsRow'
import { EditProfileSection }  from '@/components/user/EditProfileSection'
import { ChangePasswordSection } from '@/components/user/ChangePasswordSection'
import { DangerZone }          from '@/components/user/DangerZone'
import { PageSkeleton }        from '@/components/user/PageSkeleton'
import type { ProfileData }    from '@/components/user/types'
import { useProfileQuery }     from '@/hooks/queries/use-profile'
import { queryKeys }           from '@/lib/query-keys'

export default function UserPage() {
    const qc = useQueryClient()
    const { data: profile, isLoading } = useProfileQuery()

    // Child sections report the updated profile after their own writes; keep the
    // query cache as the single source of truth instead of local state.
    const setProfile = (next: ProfileData) => qc.setQueryData(queryKeys.profile.me(), next)

    if (isLoading) return <PageSkeleton />
    if (!profile) return null

    return (
        <div className="bg-canvas min-h-screen px-4 my-10 md:px-12 py-12 max-w-3xl mx-auto space-y-8">
            <ProfileHeader profile={profile} onUpdate={setProfile} />
            <StatsRow stats={profile.stats} />
            <Link
                href="/stats"
                className="flex items-center gap-2 text-xs text-fg-muted hover:text-brand transition-colors w-fit -mt-4"
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
