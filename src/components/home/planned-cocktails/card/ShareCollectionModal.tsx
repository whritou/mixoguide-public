'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Check, Link2, Link2Off, RefreshCw, Share2, X, Users, UserX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
import { plannedCollectionsApi } from '@/lib/api/planned-collections.api'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import Image from 'next/image'

interface RsvpSummary {
    id:         string
    name:       string
    status:     'going' | 'maybe' | 'not_going'
    guestCount: number
    note:       string | null
}

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

interface Props {
    collectionId:    string
    collectionTitle: string
    shareToken:      string | null
    onTokenChange:   (token: string | null) => void
    onClose:         () => void
}

type ConfirmAction = 'regenerate' | 'revoke'

export default function ShareCollectionModal({
    collectionId,
    collectionTitle,
    shareToken: initialToken,
    onTokenChange,
    onClose,
}: Props) {
    const [token,   setToken]   = useState<string | null>(initialToken)
    const [copied,  setCopied]  = useState(false)
    const [loading, setLoading] = useState(false)
    const [rsvps,   setRsvps]   = useState<RsvpSummary[]>([])
    const [loadingRsvps, setLoadingRsvps] = useState(false)
    const [canShare, setCanShare] = useState(false)
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
    const [emailTo,  setEmailTo]  = useState('')
    const [mounted,  setMounted]  = useState(false)

    const inviteUrl = token
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${token}`
        : null
    const qrCodeUrl = inviteUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=10&data=${encodeURIComponent(inviteUrl)}`
        : null

    const fetchRsvps = useCallback(async (tok: string) => {
        setLoadingRsvps(true)
        try {
            const res = await fetch(`/api/invite/${tok}`)
            if (!res.ok) return
            const json = await res.json()
            setRsvps(json.data?.rsvps ?? [])
        } catch {
            // silently ignore
        } finally {
            setLoadingRsvps(false)
        }
    }, [])

    useEffect(() => {
        if (token) void fetchRsvps(token)
    }, [token, fetchRsvps])

    useEffect(() => {
        setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
    }, [])

    useEffect(() => {
        setMounted(true)
    }, [])

    const generate = async () => {
        setLoading(true)
        try {
            const res = await plannedCollectionsApi.generateShareToken(collectionId)
            setToken(res.shareToken)
            onTokenChange(res.shareToken)
            toast.success('Invite link generated')
            void fetchRsvps(res.shareToken)
        } catch {
            toast.error('Could not generate link')
        } finally {
            setLoading(false)
        }
    }

    const revoke = async () => {
        setLoading(true)
        try {
            await plannedCollectionsApi.revokeShareToken(collectionId)
            setToken(null)
            setRsvps([])
            onTokenChange(null)
            toast.success('Invite link revoked')
        } catch {
            toast.error('Could not revoke link')
        } finally {
            setLoading(false)
        }
    }

    const copy = async () => {
        if (!inviteUrl) return
        await navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const [sendingEmail, setSendingEmail] = useState(false)

    const sendByEmail = async () => {
        const trimmed = emailTo.trim()
        if (!trimmed || !inviteUrl) return
        setSendingEmail(true)
        try {
            await plannedCollectionsApi.sendInvite(collectionId, trimmed)
            toast.success(`Invite sent to ${trimmed}`)
            setEmailTo('')
        } catch {
            toast.error('Could not send invite email')
        } finally {
            setSendingEmail(false)
        }
    }

    const shareInvite = async () => {
        if (!inviteUrl || !navigator.share) return
        try {
            await navigator.share({
                title: `${collectionTitle} invite`,
                text:  `RSVP for ${collectionTitle}`,
                url:   inviteUrl,
            })
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return
            toast.error('Could not open share sheet')
        }
    }

    const counts = {
        going:     rsvps.filter(r => r.status === 'going').length,
        maybe:     rsvps.filter(r => r.status === 'maybe').length,
        not_going: rsvps.filter(r => r.status === 'not_going').length,
    }
    const totalGuests = rsvps
        .filter(r => r.status === 'going')
        .reduce((s, r) => s + r.guestCount, 0)

    if (!mounted) return null

    return createPortal(
        <>
        <div
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-overlay/67 backdrop-blur-sm cursor-default"
            style={{ zIndex: 9999 }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="w-full max-w-md bg-canvas rounded-2xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden cursor-default">

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <Link2 size={16} className="text-brand" />
                        <h3 className="font-headline text-lg text-fg">Invite guests</h3>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1.5 rounded-full text-fg-muted hover:text-fg hover:bg-line/60 transition-colors"
                    >
                        <X size={15} />
                    </button>
                </div>

                <div className="px-6 pb-6 space-y-5 overflow-y-auto">
                    <p className="text-sm text-fg-muted">
                        Share{' '}<span className="font-medium text-fg">{collectionTitle}</span>{' '}with your guests.{' '}
                        They&apos;ll see the cocktail list and can RSVP - no account needed.
                    </p>

                    {inviteUrl ? (
                        <>
                            {/* Link display + copy */}
                            <div className="flex items-center gap-2 rounded-full border border-line-control bg-surface px-3 py-2">
                                <input
                                    readOnly
                                    value={inviteUrl}
                                    onClick={(e) => e.currentTarget.select()}
                                    onFocus={(e) => e.currentTarget.select()}
                                    aria-label="Invite URL"
                                    className="min-w-0 flex-1 bg-transparent text-xs text-fg-secondary font-mono outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={copy}
                                    className="shrink-0 p-1.5 rounded-lg text-fg-muted hover:text-brand hover:bg-line/60 transition-colors"
                                    title="Copy link"
                                    aria-label="Copy invite link"
                                >
                                    {copied ? <Check size={14} className="text-brand" /> : <Copy size={14} />}
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={copy}
                                    disabled={loading}
                                    className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full bg-brand text-fg-on-brand hover:bg-brand/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {copied ? <Check size={13} /> : <Copy size={13} />}
                                    {copied ? 'Copied!' : 'Copy link'}
                                </button>
                                {canShare && (
                                    <button
                                        type="button"
                                        onClick={() => void shareInvite()}
                                        disabled={loading}
                                        className="flex-1 py-2.5 text-xs font-label uppercase tracking-widest rounded-full border border-line-strong bg-surface text-fg-secondary hover:bg-canvas-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Share2 size={13} />
                                        Share
                                    </button>
                                )}
                            </div>

                            {/* Email invite */}
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    value={emailTo}
                                    onChange={(e) => setEmailTo(e.target.value)}
                                    placeholder="guest@example.com"
                                    className="flex-1 min-w-0 px-3 py-2 rounded-full border border-line-control bg-surface text-xs text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                <button
                                    type="button"
                                    onClick={sendByEmail}
                                    disabled={!emailTo.trim() || sendingEmail}
                                    className="shrink-0 px-4 py-2 text-xs font-label uppercase tracking-widest rounded-full border border-line-strong bg-surface text-fg-secondary hover:bg-canvas-hover transition-colors disabled:opacity-40"
                                >
                                    {sendingEmail ? 'Sending…' : 'Send'}
                                </button>
                            </div>

                            {qrCodeUrl && (
                                <div className="flex justify-center">
                                    <div className="rounded-2xl border border-line bg-surface p-3">
                                        <Image
                                            src={qrCodeUrl}
                                            alt="Invite QR code"
                                            width={160}
                                            height={160}
                                            className="h-40 w-40"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* RSVP counts */}
                            {rsvps.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-label uppercase tracking-widest text-fg-muted">
                                            RSVPs
                                        </h4>
                                        <button
                                            onClick={() => token && void fetchRsvps(token)}
                                            disabled={loadingRsvps}
                                            className="text-[10px] text-fg-muted hover:text-brand transition-colors flex items-center gap-1"
                                        >
                                            <RefreshCw size={10} className={loadingRsvps ? 'animate-spin' : ''} />
                                            Refresh
                                        </button>
                                    </div>

                                    {/* Summary pills */}
                                    <div className="flex gap-2 flex-wrap">
                                        {counts.going > 0 && (
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-label uppercase tracking-widest">
                                                <Users size={10} />
                                                {counts.going} going
                                                {totalGuests > counts.going && ` · ${totalGuests} guests`}
                                            </span>
                                        )}
                                        {counts.maybe > 0 && (
                                            <span className="px-2.5 py-1 rounded-full bg-brand-soft/15 text-fg-secondary text-xs font-label uppercase tracking-widest">
                                                {counts.maybe} maybe
                                            </span>
                                        )}
                                        {counts.not_going > 0 && (
                                            <span className="px-2.5 py-1 rounded-full bg-line text-fg-muted text-xs font-label uppercase tracking-widest">
                                                {counts.not_going} can&apos;t make it
                                            </span>
                                        )}
                                    </div>

                                    {/* Name list */}
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {rsvps.map(r => (
                                            <div key={r.id} className="flex items-center justify-between rounded-xl bg-surface border border-line px-3 py-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm text-fg font-medium truncate">{r.name}</p>
                                                    {r.note && (
                                                        <p className="text-xs text-fg-muted truncate mt-0.5">{r.note}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    {r.guestCount > 1 && (
                                                        <span className="text-xs text-fg-muted flex items-center gap-1">
                                                            <Users size={10} />{r.guestCount}
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] font-label uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status]}`}>
                                                        {STATUS_LABEL[r.status]}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {rsvps.length === 0 && !loadingRsvps && (
                                <EmptyState icon={UserX} heading="No RSVPs yet." size="card" />
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction('regenerate')}
                                    disabled={loading}
                                    className="flex-1 py-2 text-xs font-label uppercase tracking-widest rounded-full bg-line/60 text-fg-secondary hover:bg-line transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    <RefreshCw size={12} />
                                    Regenerate
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction('revoke')}
                                    disabled={loading}
                                    className="flex-1 py-2 text-xs font-label uppercase tracking-widest rounded-full bg-danger-bg text-danger hover:bg-danger/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    <Link2Off size={12} />
                                    Revoke link
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={generate}
                            disabled={loading}
                            className="w-full py-3 text-xs font-label uppercase tracking-widest rounded-full bg-brand text-fg-on-brand hover:bg-brand/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Link2 size={13} />
                            {loading ? 'Generating…' : 'Generate invite link'}
                        </button>
                    )}
                </div>
            </div>
        </div>
        {confirmAction && (
            <ConfirmDialog
                title={confirmAction === 'regenerate' ? 'Regenerate invite link?' : 'Revoke invite link?'}
                description={
                    confirmAction === 'regenerate'
                        ? 'This will break the link your guests are using. Anyone with the old invite URL will need the new one.'
                        : 'This will break the link your guests are using. Anyone with the current invite URL will no longer be able to open it.'
                }
                confirmLabel={confirmAction === 'regenerate' ? 'Regenerate' : 'Revoke'}
                onConfirm={() => {
                    const action = confirmAction
                    setConfirmAction(null)
                    if (action === 'regenerate') void generate()
                    else void revoke()
                }}
                onCancel={() => setConfirmAction(null)}
            />
        )}
        </>,
        document.body,
    )
}
