"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { MessageSquarePlus, Clock, CheckCircle2, XCircle } from "lucide-react"
import { DataTable } from "@/components/data-table/data-table"
import { createColumns } from "@/components/data-table/columns"
import { useSuggestionsQuery } from "@/hooks/queries/use-suggestions"
import { useSuggestionMutations } from "@/hooks/mutations/use-suggestion-mutations"
import type { Suggestion, SuggestionStatus, SuggestionType } from "@/lib/api/suggestions.api"

const TYPE_LABELS: Record<SuggestionType, string> = {
    NEW_COCKTAIL:      "New cocktail",
    NEW_INGREDIENT:    "New ingredient",
    MODIFY_COCKTAIL:   "Modify cocktail",
    MODIFY_INGREDIENT: "Modify ingredient",
}

const STATUS_STYLES: Record<SuggestionStatus, string> = {
    PENDING:  "bg-warning-bg text-warning",
    ACCEPTED: "bg-success-bg text-success",
    DECLINED: "bg-danger-bg text-danger",
}

type Tab = "PENDING" | "ACCEPTED" | "DECLINED" | "ALL"

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
    { value: "PENDING",  label: "Pending",  icon: Clock },
    { value: "ACCEPTED", label: "Accepted", icon: CheckCircle2 },
    { value: "DECLINED", label: "Declined", icon: XCircle },
    { value: "ALL",      label: "All",      icon: MessageSquarePlus },
]

export default function SuggestionsPage() {
    const router       = useRouter()
    const pathname     = usePathname()
    const searchParams = useSearchParams()

    const activeTab = (searchParams.get("status") || "PENDING") as Tab
    const search    = searchParams.get("search")  || ""
    const page      = Number(searchParams.get("page")  || "1")
    const limit     = Number(searchParams.get("limit") || "20")

    const { data, isLoading: loading, isError } = useSuggestionsQuery({ status: activeTab, search, page, limit })
    const suggestions = data?.items ?? []
    const total       = data?.total ?? 0
    const { remove } = useSuggestionMutations()

    const setParam = (key: string, value: string) => {
        const p = new URLSearchParams(searchParams.toString())
        p.set(key, value)
        if (key !== "page") p.set("page", "1")
        router.push(`${pathname}?${p.toString()}`)
    }

    const handleDelete = async (id: string) => {
        try {
            await remove.mutateAsync(id)
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
                    <span className="text-xs font-medium text-brand">
                        {TYPE_LABELS[row.original.type as SuggestionType] ?? row.original.type}
                    </span>
                ),
            },
            { id: "title", header: "Title", accessorKey: "title" },
            {
                id: "target",
                header: "Target",
                cell: ({ row }) => row.original.targetName
                    ? <span className="text-sm text-fg-dim">{row.original.targetName}</span>
                    : <span className="text-fg-muted">—</span>,
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
                    const cls = STATUS_STYLES[s] ?? "bg-surface-hover text-fg-secondary"
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
                    <span className="text-sm text-fg-muted">
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
                                    ? "bg-surface border-brand-soft/60 text-brand shadow-sm"
                                    : "bg-surface-subtle border-transparent text-fg-muted hover:border-brand-soft/30"
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

            {isError && (
                <p role="alert" className="text-center mt-8 text-danger">Could not load suggestions.</p>
            )}

            {!loading && !isError && suggestions.length === 0 && (
                <div className="text-center mt-8 p-8 border border-dashed rounded-xl border-line">
                    <MessageSquarePlus size={32} className="mx-auto mb-3 text-brand-soft/50" />
                    <p className="text-fg-muted">No suggestions found.</p>
                </div>
            )}
        </div>
    )
}
