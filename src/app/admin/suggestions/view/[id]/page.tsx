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
    PENDING:  { label: "Pending",  classes: "bg-amber-100 text-amber-800 border-amber-200",    icon: Clock         },
    ACCEPTED: { label: "Accepted", classes: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
    DECLINED: { label: "Declined", classes: "bg-red-100 text-red-800 border-red-200",           icon: XCircle      },
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
            <div className="animate-pulse h-8 bg-stone-100 rounded w-64 mb-6" />
            <div className="animate-pulse h-64 bg-stone-100 rounded" />
        </div>
    )

    if (!suggestion) return (
        <div className="container mx-auto py-10 text-center text-stone-500">
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
                    className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-mg-sand text-mg-muted hover:bg-mg-linen hover:text-mg-charcoal hover:border-mg-caramel/40"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            {/* Header card */}
            <div className="bg-white rounded-2xl border border-mg-sand shadow-sm overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-mg-brown to-mg-caramel px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-label uppercase tracking-widest text-white/70 mb-1">
                                {TYPE_LABELS[suggestion.type]}
                                {suggestion.targetName && <> — {suggestion.targetName}</>}
                            </p>
                            <h1 className="text-xl font-semibold text-white">{suggestion.title}</h1>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusCfg.classes} shrink-0`}>
                            <StatusIcon size={12} />
                            {statusCfg.label}
                        </span>
                    </div>
                </div>

                {/* Meta */}
                <div className="px-6 py-4 border-b border-[#f0ece8] flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
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
                    <h2 className="text-xs font-label uppercase tracking-widest text-mg-muted mb-3 flex items-center gap-2">
                        <MessageSquare size={13} /> Suggestion
                    </h2>
                    <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">{suggestion.content}</p>
                </div>
            </div>

            {/* Admin response card */}
            <div className="bg-white rounded-2xl border border-mg-sand shadow-sm p-6 mb-6">
                <h2 className="text-xs font-label uppercase tracking-widest text-mg-muted mb-4">Admin note (optional)</h2>
                <Textarea
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    placeholder="Add an internal note or feedback for this suggestion..."
                    rows={4}
                    className="border-mg-sand focus:border-mg-caramel focus:ring-mg-caramel/20 resize-none"
                />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                <Button
                    onClick={() => updateStatus("ACCEPTED")}
                    disabled={saving || suggestion.status === "ACCEPTED"}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 gap-2"
                >
                    <CheckCircle2 size={16} />
                    {suggestion.status === "ACCEPTED" ? "Already accepted" : "Accept"}
                </Button>
                <Button
                    onClick={() => updateStatus("DECLINED")}
                    disabled={saving || suggestion.status === "DECLINED"}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-full px-6 gap-2"
                >
                    <XCircle size={16} />
                    {suggestion.status === "DECLINED" ? "Already declined" : "Decline"}
                </Button>
                {suggestion.status !== "PENDING" && (
                    <Button
                        onClick={() => updateStatus("PENDING")}
                        disabled={saving}
                        variant="ghost"
                        className="text-stone-500 hover:text-stone-700 rounded-full px-6 gap-2"
                    >
                        <Clock size={16} />
                        Reset to pending
                    </Button>
                )}
            </div>
        </div>
    )
}
