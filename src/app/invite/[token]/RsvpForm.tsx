'use client'

import { useId, useState } from 'react'
import { toast } from 'sonner'
import { CheckCheck, Users } from 'lucide-react'

type RsvpStatus = 'going' | 'maybe' | 'not_going'

interface ExistingRsvp {
    id:         string
    name:       string
    status:     RsvpStatus
    guestCount: number
    note:       string | null
    email:      string | null
}

interface Props {
    token:         string
    userId:        string | null
    userName:      string | null
    userEmail:     string | null
    existingRsvp?: ExistingRsvp | null
}

const STATUS_OPTIONS: { value: RsvpStatus; label: string; activeClass: string }[] = [
    { value: 'going',     label: 'Going',        activeClass: 'border-brand bg-brand text-fg-on-brand' },
    { value: 'maybe',     label: 'Maybe',        activeClass: 'border-brand-soft bg-brand-soft/15 text-brand' },
    { value: 'not_going', label: "Can't make it", activeClass: 'border-line bg-line text-fg-secondary' },
]

export default function RsvpForm({ token, userId, userName, userEmail, existingRsvp }: Props) {
    const isEditing = !!existingRsvp
    const [name,       setName]       = useState(existingRsvp?.name ?? userName ?? '')
    const [status,     setStatus]     = useState<RsvpStatus | null>(existingRsvp?.status ?? null)
    const [guestCount, setGuestCount] = useState(existingRsvp?.guestCount ?? 1)
    const [note,       setNote]       = useState(existingRsvp?.note ?? '')
    const [email,      setEmail]      = useState(existingRsvp?.email ?? userEmail ?? '')
    const [submitting, setSubmitting] = useState(false)
    const [done,       setDone]       = useState(false)
    const [error,      setError]      = useState<string | null>(null)
    const id = useId()
    const errorId = `${id}-error`

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !status) return
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch(`/api/invite/${token}/rsvp`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    name:       name.trim(),
                    status,
                    guestCount,
                    note:       note.trim() || null,
                    email:      email.trim() || null,
                    userId,
                }),
            })
            if (!res.ok) throw new Error()
            setDone(true)
            toast.success(isEditing ? 'Your RSVP has been updated!' : 'Your RSVP has been recorded!')
        } catch {
            // A11Y-003/007: keep a persistent inline error, not only a toast.
            setError('Could not submit RSVP. Please try again.')
            toast.error('Could not submit RSVP. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (done) {
        return (
            <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
                    <CheckCheck size={28} aria-hidden="true" className="text-brand" />
                </div>
                <p className="font-headline text-xl text-fg">{isEditing ? 'RSVP updated!' : "You're all set!"}</p>
                <p className="text-sm text-fg-muted">{isEditing ? 'Your RSVP has been updated.' : 'Your RSVP was recorded.'}</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5" aria-describedby={error ? errorId : undefined}>
            <div>
                <label htmlFor={`${id}-name`} className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                    Your name
                </label>
                <input
                    id={`${id}-name`}
                    name="name"
                    autoComplete="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    maxLength={100}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {/* A11Y-009: native radio group (keyboard arrows + checked state for AT). */}
            <fieldset>
                <legend className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-2">
                    Will you be there?
                </legend>
                <div className="grid grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                        <label
                            key={opt.value}
                            className={`flex items-center justify-center rounded-xl border-2 py-3 text-center text-xs font-label uppercase tracking-widest transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 ${
                                status === opt.value ? opt.activeClass : 'border-line bg-surface text-fg-muted hover:border-line-strong'
                            }`}
                        >
                            <input
                                type="radio"
                                name={`${id}-status`}
                                value={opt.value}
                                checked={status === opt.value}
                                onChange={() => setStatus(opt.value)}
                                required
                                className="sr-only"
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </fieldset>

            <div>
                <label htmlFor={`${id}-guests`} className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                    <Users size={11} aria-hidden="true" className="inline mr-1" />
                    Guests (including you)
                </label>
                <input
                    id={`${id}-guests`}
                    name="guestCount"
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                    min={1}
                    max={50}
                    className="w-24 px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm text-fg focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            <div>
                <label htmlFor={`${id}-email`} className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                    Email <span className="normal-case font-body tracking-normal text-fg-muted">(optional — to track your RSVPs)</span>
                </label>
                <input
                    id={`${id}-email`}
                    name="email"
                    autoComplete="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={255}
                    readOnly={!!userEmail}
                    className={`w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-ring ${userEmail ? 'bg-surface-muted text-fg-secondary' : ''}`}
                />
            </div>

            <div>
                <label htmlFor={`${id}-note`} className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                    Note <span className="normal-case font-body tracking-normal text-fg-muted">(optional)</span>
                </label>
                <textarea
                    id={`${id}-note`}
                    name="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Dietary restrictions, message to the host…"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
            </div>

            {error && (
                <p id={errorId} role="alert" className="text-sm text-center text-danger bg-danger-bg rounded-xl px-4 py-3">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={submitting || !name.trim() || !status}
                className="w-full py-3 rounded-full bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand text-xs font-label uppercase tracking-widest disabled:opacity-50 transition-opacity"
            >
                {submitting ? 'Sending…' : isEditing ? 'Update RSVP' : 'Send RSVP'}
            </button>
        </form>
    )
}
