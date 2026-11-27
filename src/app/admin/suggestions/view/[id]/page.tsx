"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, XCircle, Clock, User, Calendar, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type SuggestionStatus = "PENDING" | "ACCEPTED" | "DECLINED"
type SuggestionType = "NEW_COCKTAIL" | "NEW_INGREDIENT" | "MODIFY_COCKTAIL" | "MODIFY_INGREDIENT"

interface Suggestion {
    id: string
    type: SuggestionType
    status: SuggestionStatus
    title: string
    content: string
    targetId?: string | null
    targetName?: string | null
    adminNote?: string | null
    createdAt: string
    updatedAt: string
    user: { id: string; name?: string | null; email: string; image?: string | null }
}

const TYPE_LABELS: Record<SuggestionType, string> = {
    NEW_COCKTAIL:      "New cocktail",
    NEW_INGREDIENT:    "New ingredient",
    MODIFY_COCKTAIL:   "Modify cocktail",
    MODIFY_INGREDIENT: "Modify ingredient",
}

const STATUS_CONFIG: Record<SuggestionStatus, { label: string; classes: string; icon: React.ElementType }> = {
    PENDING:  { label: "Pending",  classes: "bg-warning-bg text-warning border-warning/30",    icon: Clock         },
    ACCEPTED: { label: "Accepted", classes: "bg-success-bg text-success border-success/30", icon: CheckCircle2 },
    DECLINED: { label: "Declined", classes: "bg-danger-bg text-danger border-danger/30",           icon: XCircle      },
}

export default function ViewSuggestionPage() {
    const { id } = useParams() as { id: string }
    const router = useRouter()

    const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
    const [loading, setLoading]       = useState(true)
    const [adminNote, setAdminNote]   = useState("")
    const [saving, setSaving]         = useState(false)

    useEffect(() => {
        fetch(`/api/suggestions/${id}`)
            .then(r => r.json())
            .then(json => {
                setSuggestion(json.data)
                setAdminNote(json.data?.adminNote ?? "")
            })
            .catch(() => toast.error("Could not load suggestion"))
            .finally(() => setLoading(false))
    }, [id])

    const updateStatus = async (status: SuggestionStatus) => {
        setSaving(true)
        try {
            const res = await fetch(`/api/suggestions/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, adminNote: adminNote || null }),
            })
            if (!res.ok) throw new Error()
            const json = await res.json()
            setSuggestion(json.data)
            toast.success(`Suggestion marked as ${status.toLowerCase()}`)
        } catch {
            toast.error("Could not update suggestion")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="container mx-auto py-10">
            <div className="animate-pulse h-8 bg-surface-hover rounded w-64 mb-6" />
            <div className="animate-pulse h-64 bg-surface-hover rounded" />
        </div>
    )

    if (!suggestion) return (
        <div className="container mx-auto py-10 text-center text-fg-muted">
            Suggestion not found.
        </div>
    )

    const statusCfg = STATUS_CONFIG[suggestion.status]
    const StatusIcon = statusCfg.icon

    return (
        <div className="container mx-auto py-10 max-w-3xl">
            {/* Back */}
            <div className="mb-6">
                <Button
                    variant="outline"
                    onClick={() => router.push("/admin/suggestions")}
                    size="sm"
                    className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-line text-fg-muted hover:bg-surface-subtle hover:text-fg-secondary hover:border-brand-soft/40"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            {/* Header card */}
            <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-label uppercase tracking-widest text-fg-on-brand/80 mb-1">
                                {TYPE_LABELS[suggestion.type]}
                                {suggestion.targetName && <> — {suggestion.targetName}</>}
                            </p>
                            <h1 className="text-xl font-semibold text-fg-on-brand">{suggestion.title}</h1>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusCfg.classes} shrink-0`}>
                            <StatusIcon size={12} />
                            {statusCfg.label}
                        </span>
                    </div>
                </div>

                {/* Meta */}
                <div className="px-6 py-4 border-b border-line flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
                    <span className="flex items-center gap-1.5">
                        <User size={14} />
                        {suggestion.user?.name ?? suggestion.user?.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {new Date(suggestion.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric", month: "long", year: "numeric",
                        })}
                    </span>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <h2 className="text-xs font-label uppercase tracking-widest text-fg-muted mb-3 flex items-center gap-2">
                        <MessageSquare size={13} /> Suggestion
                    </h2>
                    <p className="text-fg-secondary whitespace-pre-wrap leading-relaxed">{suggestion.content}</p>
                </div>
            </div>

            {/* Admin response card */}
            <div className="bg-surface rounded-2xl border border-line shadow-sm p-6 mb-6">
                <h2 className="text-xs font-label uppercase tracking-widest text-fg-muted mb-4">Admin note (optional)</h2>
                <Textarea
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    placeholder="Add an internal note or feedback for this suggestion..."
                    rows={4}
                    className="border-line focus:border-brand-soft focus:ring-ring/20 resize-none"
                />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                <Button
                    onClick={() => updateStatus("ACCEPTED")}
                    disabled={saving || suggestion.status === "ACCEPTED"}
                    className="bg-success hover:bg-success/90 text-fg-on-brand rounded-full px-6 gap-2"
                >
                    <CheckCircle2 size={16} />
                    {suggestion.status === "ACCEPTED" ? "Already accepted" : "Accept"}
                </Button>
                <Button
                    onClick={() => updateStatus("DECLINED")}
                    disabled={saving || suggestion.status === "DECLINED"}
                    variant="outline"
                    className="border-danger/30 text-danger hover:bg-danger-bg hover:border-danger/50 rounded-full px-6 gap-2"
                >
                    <XCircle size={16} />
                    {suggestion.status === "DECLINED" ? "Already declined" : "Decline"}
                </Button>
                {suggestion.status !== "PENDING" && (
                    <Button
                        onClick={() => updateStatus("PENDING")}
                        disabled={saving}
                        variant="ghost"
                        className="text-fg-muted hover:text-fg-secondary rounded-full px-6 gap-2"
                    >
                        <Clock size={16} />
                        Reset to pending
                    </Button>
                )}
            </div>
        </div>
    )
}
