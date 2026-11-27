'use client'

import { useState } from 'react'
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !status) return
        setSubmitting(true)
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
            toast.error('Could not submit RSVP. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (done) {
        return (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
                    <CheckCheck size={28} className="text-brand" />
                </div>
                <p className="font-headline text-xl text-fg">{isEditing ? 'RSVP updated!' : "You're all set!"}</p>
                <p className="text-sm text-fg-muted">{isEditing ? 'Your RSVP has been updated.' : 'Your RSVP was recorded.'}</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                    Your name
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    maxLength={100}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                />
            </div>

            <div>
                <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-2">
                    Will you be there?
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStatus(opt.value)}
                            className={`flex items-center justify-center rounded-xl border-2 py-3 text-xs font-label uppercase tracking-widest transition-all ${
                                status === opt.value ? opt.activeClass : 'border-line bg-surface text-fg-muted hover:border-line-strong'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                    <Users size={11} className="inline mr-1" />
                    Guests (including you)
                </label>
                <input
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                    min={1}
                    max={50}
                    className="w-24 px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm text-fg focus:outline-none focus:ring-1 focus:ring-ring"
                />
            </div>

            <div>
                <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                    Email <span className="normal-case font-body tracking-normal text-fg-muted/60">(optional — to track your RSVPs)</span>
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={255}
                    readOnly={!!userEmail}
                    className={`w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring ${userEmail ? 'opacity-60' : ''}`}
                />
            </div>

            <div>
                <label className="block text-xs font-label uppercase tracking-widest text-fg-muted mb-1.5">
                    Note <span className="normal-case font-body tracking-normal text-fg-muted/60">(optional)</span>
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Dietary restrictions, message to the host…"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-line-control text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
            </div>

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
