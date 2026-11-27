'use client'

import { CalendarDays, Users, ExternalLink } from 'lucide-react'
import { useMyRsvpsQuery } from '@/hooks/queries/use-planned-collections'

const STATUS_LABEL: Record<string, string> = {
    going:     'Going',
    maybe:     'Maybe',
    not_going: "Can't make it",
}
const STATUS_STYLE: Record<string, string> = {
    going:     'bg-brand/10 text-brand',
    maybe:     'bg-brand-soft/15 text-fg-secondary',
    not_going: 'bg-line text-fg-muted',
}

export default function MyRsvpsSection() {
    const { data: rsvps = [], isLoading: loading } = useMyRsvpsQuery()

    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2].map(i => (
                    <div key={i} className="h-20 rounded-xl bg-line/40 animate-pulse" />
                ))}
            </div>
        )
    }

    if (rsvps.length === 0) {
        return (
            <div className="rounded-2xl border border-line bg-surface p-8 text-center">
                <p className="text-sm text-fg-muted">You haven&apos;t RSVP&apos;d to any events yet.</p>
                <p className="text-xs text-fg-muted/70 mt-1">When a host shares an invite link with you, your RSVP will appear here.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {rsvps.map(rsvp => {
                const date = new Date(rsvp.collection.plannedFor).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                })
                const isHostedByCurrentUser = rsvp.collection.userId === rsvp.userId
                const hostLabel = isHostedByCurrentUser
                    ? 'you'
                    : rsvp.collection.user?.name
                const inviteUrl = rsvp.collection.shareEnabled && rsvp.collection.shareToken
                    ? `/invite/${rsvp.collection.shareToken}`
                    : null

                return (
                    <div
                        key={rsvp.id}
                        className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-4"
                    >
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                                <p className="font-headline text-base text-fg leading-tight">
                                    {rsvp.collection.title}
                                </p>
                                {inviteUrl && (
                                    <a
                                        href={inviteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 text-fg-muted hover:text-brand transition-colors mt-0.5"
                                    >
                                        <ExternalLink size={12} />
                                    </a>
                                )}
                            </div>
                            {hostLabel && (
                                <p className="text-xs text-fg-muted mt-0.5">
                                    Hosted by {hostLabel}
                                </p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-fg-muted">
                                    <CalendarDays size={11} />
                                    {date}
                                </span>
                                {rsvp.guestCount > 1 && (
                                    <span className="flex items-center gap-1 text-xs text-fg-muted">
                                        <Users size={11} />
                                        {rsvp.guestCount} guests
                                    </span>
                                )}
                            </div>
                            {rsvp.note && (
                                <p className="text-xs text-fg-muted/80 mt-1 italic truncate">&ldquo;{rsvp.note}&rdquo;</p>
                            )}
                        </div>
                        <span className={`shrink-0 text-[10px] font-label uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_STYLE[rsvp.status]}`}>
                            {STATUS_LABEL[rsvp.status]}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
