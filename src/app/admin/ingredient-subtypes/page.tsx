"use client"

import { useMemo } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { toast } from "sonner"

import { DataTable } from "@/components/data-table/data-table"
import { createColumns } from "@/components/data-table/columns"
import { useIngredientSubTypeMutations } from '@/hooks/mutations/use-ingredient-subtype-mutations'
import type { IngredientSubType } from "@/types/models/ingredient-sub-type"
import {useIngredientSubTypesQuery} from "@/hooks/queries/use-ingredient-subtypes";

export default function SubTypeList() {
    const sp = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const search = sp.get("search") || ""
    const page   = Number(sp.get("page") || "1")
    const limit  = Number(sp.get("limit") || "20")
    const sortBy   = sp.get("sortBy") || "name"

    const queryParams = useMemo(() => ({ search, page, limit, sortBy, include: "type" }), [search, page, limit, sortBy])

    const { data, isLoading, isFetching, isError, error } = useIngredientSubTypesQuery(queryParams)
    const { remove } = useIngredientSubTypeMutations()

    const ingredientSubTypes = data?.items ?? []
    const totalItems = data?.meta?.total || 0

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this sub-type?")) return
        try {
            await remove.mutateAsync(id)
            toast.success("Sub-type deleted successfully")
        } catch {
            toast.error("Error deleting sub-type")
        }
    }

    const columns = createColumns<IngredientSubType>({
        columns: [
            { id: "name", header: "Name", accessorKey: "name" },
            { id: "type", header: "Type", cell: ({ row }) => row.original.type?.name ?? "—" },
        ],
        viewRoute: "/admin/ingredient-subtypes/view",
        editRoute: "/admin/ingredient-subtypes/edit",
        onDelete: handleDelete,
    })

    /* ───────── search action ───────── */
    const handleSearchChange = (value: string) => {
        const params = new URLSearchParams(sp.toString())
        if (value) params.set('search', value)
        else params.delete('search')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const handleRowDoubleClick = (ing: IngredientSubType) =>
        router.push(`/admin/ingredient-subtypes/view/${ing.id}`)

    if (isError) {
        return (
            <div className="text-center mt-8 p-4 border rounded-md">
                <p className="text-danger">
                    {error instanceof Error ? error.message : "Error loading ingredient sub-types"}
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10">
            <DataTable
                columns={columns}
                data={ingredientSubTypes}
                searchValue={search}
                onSearchChange={handleSearchChange}
                searchColumn="name"
                pageTitle="Ingredient sub-types"
                createButtonLink="/admin/ingredient-subtypes/create"
                createButtonLabel="New Sub-type"
                pageDescription="Manage the secondary categories of ingredients."
                isLoading={isLoading}
                isFetching={isFetching}
                totalItems={totalItems}
                onRowDoubleClick={handleRowDoubleClick}
                pagination={{
                    pageIndex: page - 1,
                    pageSize: limit,
                    setPageIndex: index => {
                        const params = new URLSearchParams(sp.toString())
                        params.set('page', String(index + 1))
                        router.push(`${pathname}?${params.toString()}`)
                    },
                    setPageSize: size => {
                        const params = new URLSearchParams(sp.toString())
                        params.set('limit', String(size))
                        params.set('page', '1')
                        router.push(`${pathname}?${params.toString()}`)
                    },
                }}

            />
        </div>
    )
}
