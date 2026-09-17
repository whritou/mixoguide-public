"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { MessageSquarePlus, Clock, CheckCircle2, XCircle } from "lucide-react"
import { DataTable } from "@/components/data-table/data-table"
import { createColumns } from "@/components/data-table/columns"

type SuggestionStatus = "PENDING" | "ACCEPTED" | "DECLINED"
type SuggestionType   = "NEW_COCKTAIL" | "NEW_INGREDIENT" | "MODIFY_COCKTAIL" | "MODIFY_INGREDIENT"

interface Suggestion {
    id:          string
    type:        SuggestionType
    status:      SuggestionStatus
    title:       string
    content:     string
    targetName?: string | null
    adminNote?:  string | null
    createdAt:   string
    user:        { id: string; name?: string | null; email: string }
}

const TYPE_LABELS: Record<SuggestionType, string> = {
    NEW_COCKTAIL:      "New cocktail",
    NEW_INGREDIENT:    "New ingredient",
    MODIFY_COCKTAIL:   "Modify cocktail",
    MODIFY_INGREDIENT: "Modify ingredient",
}

const STATUS_STYLES: Record<SuggestionStatus, string> = {
    PENDING:  "bg-amber-100 text-amber-800",
    ACCEPTED: "bg-emerald-100 text-emerald-800",
    DECLINED: "bg-red-100 text-red-800",
}

type Tab = "PENDING" | "ACCEPTED" | "DECLINED" | "ALL"

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
    { value: "PENDING",  label: "Pending",  icon: Clock },
    { value: "ACCEPTED", label: "Accepted", icon: CheckCircle2 },
    { value: "DECLINED", label: "Declined", icon: XCircle },
    { value: "ALL",      label: "All",      icon: MessageSquarePlus },
]

async function fetchSuggestions(status: Tab, search: string, page: number, limit: number) {
    const params = new URLSearchParams()
    if (status !== "ALL") params.set("filters", JSON.stringify({ status }))
    if (search) params.set("search", search)
    params.set("page",  String(page))
    params.set("limit", String(limit))
    const res = await fetch(`/api/suggestions?${params.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch suggestions")
    return res.json()
}

export default function SuggestionsPage() {
    const router       = useRouter()
    const pathname     = usePathname()
    const searchParams = useSearchParams()

    const activeTab = (searchParams.get("status") || "PENDING") as Tab
    const search    = searchParams.get("search")  || ""
    const page      = Number(searchParams.get("page")  || "1")
    const limit     = Number(searchParams.get("limit") || "20")

    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const [total,       setTotal]       = useState(0)
    const [loading,     setLoading]     = useState(true)

    useEffect(() => {
        setLoading(true)
        fetchSuggestions(activeTab, search, page, limit)
            .then(json => {
                setSuggestions(json.data ?? [])
                setTotal(json.meta?.total ?? 0)
            })
            .catch(() => toast.error("Could not load suggestions"))
            .finally(() => setLoading(false))
    }, [activeTab, search, page, limit])

    const setParam = (key: string, value: string) => {
        const p = new URLSearchParams(searchParams.toString())
        p.set(key, value)
        if (key !== "page") p.set("page", "1")
        router.push(`${pathname}?${p.toString()}`)
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/suggestions/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error()
            setSuggestions(prev => prev.filter(s => s.id !== id))
            toast.success("Suggestion deleted")
        } catch {
            toast.error("Could not delete suggestion")
        }
    }

    const columns = createColumns<Suggestion>({
        columns: [
            {
                id: "type",
                header: "Type",
                cell: ({ row }) => (
                    <span className="text-xs font-medium text-mg-brown">
                        {TYPE_LABELS[row.original.type as SuggestionType] ?? row.original.type}
                    </span>
                ),
            },
            { id: "title", header: "Title", accessorKey: "title" },
            {
                id: "target",
                header: "Target",
                cell: ({ row }) => row.original.targetName
                    ? <span className="text-sm text-stone-600">{row.original.targetName}</span>
                    : <span className="text-stone-400">—</span>,
            },
            {
                id: "user",
                header: "Submitted by",
                cell: ({ row }) => (
                    <span className="text-sm">{row.original.user?.name ?? row.original.user?.email ?? "—"}</span>
                ),
            },
            {
                id: "status",
                header: "Status",
                cell: ({ row }) => {
                    const s = row.original.status as SuggestionStatus
                    const cls = STATUS_STYLES[s] ?? "bg-stone-100 text-stone-700"
                    const Icon = s === "ACCEPTED" ? CheckCircle2 : s === "DECLINED" ? XCircle : Clock
                    return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
                            <Icon size={12} />
                            {s}
                        </span>
                    )
                },
            },
            {
                id: "createdAt",
                header: "Date",
                cell: ({ row }) => (
                    <span className="text-sm text-stone-500">
                        {new Date(row.original.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                        })}
                    </span>
                ),
            },
        ],
        viewRoute: "/admin/suggestions/view",
        onDelete:  handleDelete,
    })

    return (
        <div className="container mx-auto py-10">
            {/* Status tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {TABS.map(tab => {
                    const Icon   = tab.icon
                    const active = activeTab === tab.value
                    return (
                        <button
                            key={tab.value}
                            onClick={() => setParam("status", tab.value)}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                                active
                                    ? "bg-white border-mg-caramel/60 text-mg-brown shadow-sm"
                                    : "bg-mg-linen border-transparent text-mg-muted hover:border-mg-caramel/30"
                            }`}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            <DataTable
                columns={columns}
                data={suggestions}
                searchColumn="title"
                searchValue={search}
                onSearchChange={(v: string) => setParam("search", v)}
                searchPlaceholder="Search suggestions..."
                pageTitle="Suggestions"
                pageDescription="Review and manage user suggestions"
                totalItems={total}
                isLoading={loading}
                onRowDoubleClick={(row: Suggestion) => router.push(`/admin/suggestions/view/${row.id}`)}
                pagination={{
                    pageIndex: page - 1,
                    pageSize:  limit,
                    setPageIndex: (i: number) => setParam("page", String(i + 1)),
                    setPageSize:  (s: number) => setParam("limit", String(s)),
                }}
            />

            {!loading && suggestions.length === 0 && (
                <div className="text-center mt-8 p-8 border border-dashed rounded-xl border-mg-sand">
                    <MessageSquarePlus size={32} className="mx-auto mb-3 text-mg-caramel/50" />
                    <p className="text-stone-500">No suggestions found.</p>
                </div>
            )}
        </div>
    )
}
