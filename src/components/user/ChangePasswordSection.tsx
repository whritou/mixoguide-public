'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Section } from './Section'

export function ChangePasswordSection() {
    const [current, setCurrent] = useState('')
    const [next,    setNext]    = useState('')
    const [confirm, setConfirm] = useState('')
    const [saving,  setSaving]  = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
    const id = useId()
    const feedbackId = `${id}-feedback`

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (next !== confirm) {
            setFeedback({ type: 'err', msg: 'New passwords do not match.' })
            return
        }
        setSaving(true)
        setFeedback(null)

        const res = await fetch('/api/user/me/change-password', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
        })

        setSaving(false)

        if (res.ok) {
            setFeedback({ type: 'ok', msg: 'Password updated successfully.' })
            setCurrent(''); setNext(''); setConfirm('')
        } else {
            const data = await res.json()
            setFeedback({ type: 'err', msg: data.error?.message ?? 'Failed to update password.' })
        }
    }

    const fields = [
        { key: 'current', label: 'Current password', val: current, set: setCurrent, min: 1, autoComplete: 'current-password' },
        { key: 'new',     label: 'New password',     val: next,    set: setNext,    min: 8, autoComplete: 'new-password' },
        { key: 'confirm', label: 'Confirm new password', val: confirm, set: setConfirm, min: 8, autoComplete: 'new-password' },
    ] as const

    return (
        <Section icon={Lock} title="Change Password">
            <form onSubmit={handleSubmit} className="space-y-4">
                {fields.map(({ key, label, val, set, min, autoComplete }) => (
                    <div key={key}>
                        <label htmlFor={`${id}-${key}`} className="block text-xs font-label uppercase tracking-widest text-fg-secondary mb-1.5">
                            {label}
                        </label>
                        <input
                            id={`${id}-${key}`}
                            name={key}
                            type="password"
                            autoComplete={autoComplete}
                            aria-invalid={feedback?.type === 'err' || undefined}
                            aria-describedby={feedback?.type === 'err' ? feedbackId : undefined}
                            value={val}
                            onChange={(e) => { set(e.target.value); setFeedback(null) }}
                            required
                            minLength={min}
                            className="w-full px-4 py-3 rounded-xl border border-line-control bg-line/50 text-sm font-body text-fg
                                       placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-ring aria-[invalid=true]:border-danger"
                        />
                    </div>
                ))}

                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={saving || !current || !next || !confirm}
                        className="px-6 py-2.5 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand rounded-full
                                   font-label text-xs uppercase tracking-widest
                                   motion-safe:hover:scale-[0.98] transition-transform
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Updating…' : 'Update password'}
                    </button>
                    {feedback && (
                        <p
                            id={feedbackId}
                            role={feedback.type === 'err' ? 'alert' : 'status'}
                            className={`text-sm font-body ${feedback.type === 'ok' ? 'text-brand' : 'text-danger'}`}
                        >
                            {feedback.msg}
                        </p>
                    )}
                </div>
            </form>
            <p className="mt-3 text-xs text-fg-muted font-body">
                Forgot your password?{' '}
                <Link href="/request-reset-password" className="text-brand hover:underline">
                    Reset via email
                </Link>
                .
            </p>
        </Section>
    )
}
