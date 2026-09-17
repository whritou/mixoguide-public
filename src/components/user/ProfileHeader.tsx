'use client'

import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUploadAvatar } from '@/hooks/mutations/use-upload-avatar'
import type { ProfileData } from './types'

interface ProfileHeaderProps {
    profile: ProfileData
    onUpdate: (p: ProfileData) => void
}

export function ProfileHeader({ profile, onUpdate }: ProfileHeaderProps) {
    const fileRef  = useRef<HTMLInputElement>(null)
    const uploadAvatar = useUploadAvatar()
    const uploading    = uploadAvatar.isPending

    async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const url = await uploadAvatar.mutateAsync(file)
            const res = await fetch('/api/user/me', {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ image: url }),
            })
            if (res.ok) {
                const data = await res.json()
                onUpdate({ ...profile, image: data.data?.image ?? data.image ?? url })
            }
        } finally {
            e.target.value = ''
        }
    }

    const joinYear = new Date(profile.createdAt).getFullYear()

    return (
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <div className="relative">
                <Avatar className="w-24 h-24 ring-2 ring-mg-bone/40">
                    <AvatarImage src={profile.image ?? ''} />
                    <AvatarFallback className="bg-mg-brown text-white text-3xl font-headline">
                        {profile.name?.[0]?.toUpperCase() ?? '?'}
                    </AvatarFallback>
                </Avatar>
                <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-mg-brown to-mg-caramel
                               rounded-full flex items-center justify-center shadow hover:scale-105 transition-transform
                               disabled:opacity-60"
                    aria-label="Change avatar"
                >
                    <Camera size={14} className="text-white" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            </div>

            <div className="text-center sm:text-left">
                <h1 className="font-headline text-3xl text-mg-ink">{profile.name ?? 'Your Profile'}</h1>
                <p className="text-sm text-mg-charcoal/70 font-body">{profile.email}</p>
                <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                    {profile.role === 'ADMIN' && (
                        <span className="text-xs font-label uppercase tracking-widest bg-mg-brown text-white px-2 py-0.5 rounded-full">
                            Admin
                        </span>
                    )}
                    <span className="text-xs text-mg-ink/40 font-body">Member since {joinYear}</span>
                </div>
            </div>
        </div>
    )
}
