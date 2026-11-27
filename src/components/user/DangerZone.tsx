'use client'

import { useId, useState } from 'react'
import { signOut } from 'next-auth/react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Section } from './Section'

export function DangerZone({ hasPassword }: { hasPassword: boolean }) {
    const [open,        setOpen]        = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [password,    setPassword]    = useState('')
    const [deleting,    setDeleting]    = useState(false)
    const [error,       setError]       = useState('')
    const id = useId()
    const errorId = `${id}-error`

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
            <p className="text-sm text-fg-secondary font-body mb-4">
                Permanently delete your account and all associated data — pantry, favourites, ratings, and planned cocktails.
                This action <strong>cannot be undone</strong>.
            </p>

            {!open ? (
                <button
                    type="button"
                    aria-expanded={false}
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 border border-danger/40 text-danger rounded-full
                               text-xs font-label uppercase tracking-widest hover:bg-danger/5 transition-colors"
                >
                    <Trash2 size={14} aria-hidden="true" />
                    Delete my account
                </button>
            ) : (
                <div className="bg-danger-bg/40 border border-danger/20 rounded-2xl p-5 space-y-4">
                    <label htmlFor={`${id}-confirm`} className="block text-sm font-body text-danger">
                        Type <strong>DELETE</strong> below to confirm. This will permanently delete your account and all data.
                        {!hasPassword && ' No password needed — you signed up with Google.'}
                    </label>

                    <input
                        id={`${id}-confirm`}
                        name="confirmDelete"
                        autoComplete="off"
                        aria-invalid={!!error || undefined}
                        aria-describedby={error ? errorId : undefined}
                        value={confirmText}
                        onChange={(e) => { setConfirmText(e.target.value); setError('') }}
                        placeholder="DELETE"
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl bg-surface text-sm font-body text-fg
                                   border border-danger/30 focus:outline-none focus:ring-2 focus:ring-danger"
                    />

                    {hasPassword && (
                        <div>
                            <label htmlFor={`${id}-password`} className="block text-xs font-label uppercase tracking-widest text-danger mb-1.5">
                                Confirm your password
                            </label>
                            <input
                                id={`${id}-password`}
                                name="currentPassword"
                                type="password"
                                autoComplete="current-password"
                                aria-invalid={!!error || undefined}
                                aria-describedby={error ? errorId : undefined}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError('') }}
                                placeholder="Your current password"
                                className="w-full px-4 py-3 rounded-xl bg-surface text-sm font-body text-fg
                                           border border-danger/30 focus:outline-none focus:ring-2 focus:ring-danger"
                            />
                        </div>
                    )}

                    {error && <p id={errorId} role="alert" className="text-sm text-danger font-body">{error}</p>}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting || confirmText !== 'DELETE' || (hasPassword && !password)}
                            className="px-5 py-2.5 bg-danger text-fg-on-brand rounded-full
                                       font-label text-xs uppercase tracking-widest
                                       hover:bg-danger/90 transition-colors
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleting ? 'Deleting…' : 'Yes, delete permanently'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setOpen(false); setConfirmText(''); setPassword(''); setError('') }}
                            className="px-5 py-2.5 rounded-full border border-fg/20 text-sm font-body
                                       text-fg-secondary hover:bg-fg/5 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </Section>
    )
}
