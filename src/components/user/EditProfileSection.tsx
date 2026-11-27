'use client'

import { useId, useState } from 'react'
import { User } from 'lucide-react'
import { Section } from './Section'
import type { ProfileData } from './types'

interface EditProfileSectionProps {
    profile: ProfileData
    onUpdate: (p: ProfileData) => void
}

export function EditProfileSection({ profile, onUpdate }: EditProfileSectionProps) {
    const [name,     setName]     = useState(profile.name ?? '')
    const [saving,   setSaving]   = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
    const id = useId()

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setFeedback(null)

        const res = await fetch('/api/user/me', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name }),
        })

        setSaving(false)

        if (res.ok) {
            const data = await res.json()
            onUpdate({ ...profile, name: data.data?.name ?? data.name ?? name })
            setFeedback({ type: 'ok', msg: 'Profile updated.' })
        } else {
            const data = await res.json()
            setFeedback({ type: 'err', msg: data.error?.message ?? 'Update failed.' })
        }
    }

    return (
        <Section icon={User} title="Edit Profile">
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label htmlFor={`${id}-name`} className="block text-xs font-label uppercase tracking-widest text-fg-secondary mb-1.5">
                        Display name
                    </label>
                    <input
                        id={`${id}-name`}
                        name="name"
                        autoComplete="name"
                        aria-invalid={feedback?.type === 'err' || undefined}
                        aria-describedby={feedback ? `${id}-feedback` : undefined}
                        value={name}
                        onChange={(e) => { setName(e.target.value); setFeedback(null) }}
                        minLength={2}
                        maxLength={100}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-line-control bg-line/50 text-sm font-body text-fg
                                   placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-ring aria-[invalid=true]:border-danger"
                    />
                </div>
                <div>
                    <label htmlFor={`${id}-email`} className="block text-xs font-label uppercase tracking-widest text-fg-secondary mb-1.5">
                        Email
                    </label>
                    <input
                        id={`${id}-email`}
                        name="email"
                        type="email"
                        autoComplete="email"
                        aria-describedby={`${id}-email-hint`}
                        value={profile.email}
                        readOnly
                        className="w-full px-4 py-3 rounded-xl bg-surface-muted text-sm font-body text-fg-muted cursor-not-allowed"
                    />
                    <p id={`${id}-email-hint`} className="text-xs text-fg-muted font-body mt-1">Email cannot be changed.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={saving || name === (profile.name ?? '')}
                        className="px-6 py-2.5 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand rounded-full
                                   font-label text-xs uppercase tracking-widest
                                   motion-safe:hover:scale-[0.98] transition-transform
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    {feedback && (
                        <p
                            id={`${id}-feedback`}
                            role={feedback.type === 'err' ? 'alert' : 'status'}
                            className={`text-sm font-body ${feedback.type === 'ok' ? 'text-brand' : 'text-danger'}`}
                        >
                            {feedback.msg}
                        </p>
                    )}
                </div>
            </form>
        </Section>
    )
}
