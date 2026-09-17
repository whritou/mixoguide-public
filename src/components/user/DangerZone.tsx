'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Section } from './Section'

export function DangerZone({ hasPassword }: { hasPassword: boolean }) {
    const [open,        setOpen]        = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [password,    setPassword]    = useState('')
    const [deleting,    setDeleting]    = useState(false)
    const [error,       setError]       = useState('')

    async function handleDelete() {
        if (confirmText !== 'DELETE') return
        setDeleting(true)
        setError('')

        const res = await fetch('/api/user/me', {
            method:  'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ password: hasPassword ? password : undefined }),
        })

        if (!res.ok) {
            const data = await res.json()
            setError(data.error?.message ?? 'Deletion failed. Please try again.')
            setDeleting(false)
            return
        }

        await signOut({ callbackUrl: '/' })
    }

    return (
        <Section icon={AlertTriangle} title="Danger Zone" danger>
            <p className="text-sm text-mg-charcoal/80 font-body mb-4">
                Permanently delete your account and all associated data — pantry, favourites, ratings, and planned cocktails.
                This action <strong>cannot be undone</strong>.
            </p>

            {!open ? (
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 border border-mg-danger/40 text-mg-danger rounded-full
                               text-xs font-label uppercase tracking-widest hover:bg-mg-danger/5 transition-colors"
                >
                    <Trash2 size={14} />
                    Delete my account
                </button>
            ) : (
                <div className="bg-mg-danger-light/40 border border-mg-danger/20 rounded-2xl p-5 space-y-4">
                    <p className="text-sm font-body text-mg-danger">
                        Type <strong>DELETE</strong> below to confirm. This will permanently delete your account and all data.
                        {!hasPassword && ' No password needed — you signed up with Google.'}
                    </p>

                    <input
                        value={confirmText}
                        onChange={(e) => { setConfirmText(e.target.value); setError('') }}
                        placeholder="DELETE"
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl bg-white/70 text-sm font-body text-mg-ink
                                   border border-mg-danger/30 focus:outline-none focus:ring-1 focus:ring-mg-danger"
                    />

                    {hasPassword && (
                        <div>
                            <label className="block text-xs font-label uppercase tracking-widest text-mg-danger/70 mb-1.5">
                                Confirm your password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError('') }}
                                placeholder="Your current password"
                                className="w-full px-4 py-3 rounded-xl bg-white/70 text-sm font-body text-mg-ink
                                           border border-mg-danger/30 focus:outline-none focus:ring-1 focus:ring-mg-danger"
                            />
                        </div>
                    )}

                    {error && <p className="text-sm text-mg-danger font-body">{error}</p>}

                    <div className="flex gap-3">
                        <button
                            onClick={handleDelete}
                            disabled={deleting || confirmText !== 'DELETE' || (hasPassword && !password)}
                            className="px-5 py-2.5 bg-mg-danger text-white rounded-full
                                       font-label text-xs uppercase tracking-widest
                                       hover:bg-[#9e1515] transition-colors
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleting ? 'Deleting…' : 'Yes, delete permanently'}
                        </button>
                        <button
                            onClick={() => { setOpen(false); setConfirmText(''); setPassword(''); setError('') }}
                            className="px-5 py-2.5 rounded-full border border-mg-ink/20 text-sm font-body
                                       text-mg-ink/70 hover:bg-mg-ink/5 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </Section>
    )
}
