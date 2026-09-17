'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, MessageSquarePlus, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type SuggestionType =
    | 'NEW_COCKTAIL'
    | 'NEW_INGREDIENT'
    | 'MODIFY_COCKTAIL'
    | 'MODIFY_INGREDIENT'

interface Props {
    open:         boolean
    onOpenChange: (b: boolean) => void
    /** Pre-select the type (e.g. MODIFY_COCKTAIL when opened from a cocktail page) */
    defaultType?: SuggestionType
    /** When suggesting a modification — the existing item's id */
    targetId?:    string
    /** Human-readable name of the target item */
    targetName?:  string
}

const TYPE_OPTIONS: { value: SuggestionType; label: string }[] = [
    { value: 'NEW_COCKTAIL',      label: 'Suggest a new cocktail'    },
    { value: 'NEW_INGREDIENT',    label: 'Suggest a new ingredient'  },
    { value: 'MODIFY_COCKTAIL',   label: 'Suggest a cocktail change' },
    { value: 'MODIFY_INGREDIENT', label: 'Suggest an ingredient change' },
]

export default function SuggestionDialog({
    open,
    onOpenChange,
    defaultType,
    targetId,
    targetName,
}: Props) {
    const { data: session } = useSession()

    const [type,        setType]        = useState<SuggestionType>(defaultType ?? 'NEW_COCKTAIL')
    const [title,       setTitle]       = useState('')
    const [content,     setContent]     = useState('')
    const [submitting,  setSubmitting]  = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim())   { toast.error('Please add a title'); return }
        if (!content.trim()) { toast.error('Please describe your suggestion'); return }
        if (content.length < 10) { toast.error('Please add more detail (min 10 characters)'); return }

        setSubmitting(true)
        try {
            const res = await fetch('/api/suggestions', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    title:      title.trim(),
                    content:    content.trim(),
                    targetId:   targetId   ?? null,
                    targetName: targetName ?? null,
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err?.error?.message ?? 'Failed to submit suggestion')
            }
            toast.success('Suggestion submitted! We\'ll review it soon.')
            setTitle('')
            setContent('')
            onOpenChange(false)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not submit suggestion')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-0 border-0 gap-0 [&>button]:hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-mg-brown to-mg-caramel px-6 py-5 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquarePlus size={18} className="text-white/80" />
                            <p className="text-xs font-medium uppercase tracking-widest text-white/70">
                                Community contribution
                            </p>
                        </div>
                        <DialogTitle className="text-lg font-semibold text-white">
                            {targetName
                                ? `Suggest a change to "${targetName}"`
                                : 'Submit a suggestion'}
                        </DialogTitle>
                    </div>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        aria-label="Close suggestion dialog"
                        className="text-white/60 hover:text-white transition-colors mt-0.5"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Type selector — hide when it's locked to a modification */}
                    {!targetId && (
                        <div>
                            <label className="block text-xs font-medium uppercase tracking-widest text-mg-muted mb-2">
                                Suggestion type
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {TYPE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setType(opt.value)}
                                        className={`px-3 py-2 rounded-lg text-sm text-left border transition-colors ${
                                            type === opt.value
                                                ? 'bg-[#f5ece0] border-mg-caramel text-mg-brown font-medium'
                                                : 'border-mg-sand text-stone-600 hover:border-mg-caramel/40 hover:bg-[#faf9f7]'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-widest text-mg-muted mb-2">
                            Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={200}
                            placeholder={
                                targetId
                                    ? 'e.g. "Wrong ABV listed" or "Better garnish idea"'
                                    : 'e.g. "Add a Penicillin cocktail"'
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-mg-sand text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-mg-caramel focus:ring-2 focus:ring-mg-caramel/20"
                            required
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-widest text-mg-muted mb-2">
                            Details <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            rows={5}
                            maxLength={5000}
                            placeholder={
                                targetId
                                    ? 'Describe what should be changed and why...'
                                    : 'Describe the cocktail, its ingredients, how to make it, and why you think it\'d be a great addition...'
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-mg-sand text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-mg-caramel focus:ring-2 focus:ring-mg-caramel/20 resize-none"
                            required
                        />
                        <p className="mt-1 text-xs text-stone-400 text-right">{content.length}/5000</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 px-4 py-2.5 rounded-full border border-mg-sand text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-mg-brown to-mg-caramel text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    Submitting…
                                </>
                            ) : (
                                <>
                                    <MessageSquarePlus size={15} />
                                    Submit suggestion
                                </>
                            )}
                        </button>
                    </div>

                    {!session?.user && (
                        <p className="text-center text-xs text-stone-400">
                            You need to be signed in to submit a suggestion.
                        </p>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    )
}
