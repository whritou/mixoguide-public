"use client"

import {useMemo} from "react"
import {usePathname, useRouter, useSearchParams} from "next/navigation"
import { toast } from "sonner"
import { PackageOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

import { DataTable } from "@/components/data-table/data-table"
import { createColumns, CellComponents } from "@/components/data-table/columns"
import { useIngredientMutations } from '@/hooks/mutations/use-ingredient-mutations'
import {useIngredientsQuery} from "@/hooks/queries/use-ingredients";

interface Ingredient {
  id: string
  name: string
  type?:    { id: string; name: string }
  subType?: { id: string; name: string; typeId: string }
  description?: string
  quantity?: number
  isAlcoholic?: boolean
  abv?: number
  imageUrl?: string
}

export default function IngredientsPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const search  = searchParams.get('search') || ''
    const page    = Number(searchParams.get('page') || '1')
    const limit   = Number(searchParams.get('limit') || '20')
    const sortBy  = searchParams.get('sortBy') || 'name'
    const sortOrder = "asc"

    const queryParams = useMemo(
        () => ({
            search,
            page,
            limit,
            sortBy,
            sortOrder,
            include: ["type", "subType"],
        }),
        [search, page, limit, sortBy]
    )
    const { data, isLoading, isError, error, isFetching } = useIngredientsQuery(queryParams)

    const ingredients = data?.items ?? []
    const totalItems = data?.meta.total || 0

    const { remove } = useIngredientMutations()

    const handleDelete = async (id: string) => {
        try {
            await remove.mutateAsync(id)
            toast.success('Ingredient deleted successfully.')
        } catch {
            toast.error('Error deleting ingredient')
        }
    }

  /* ───────── search action ───────── */
  const handleSearchChange = (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set('search', value)
      else params.delete('search')
      params.set('page', '1')
      router.push(`${pathname}?${params.toString()}`)
  }

  /* ───────── double-click action ───────── */
  const handleRowDoubleClick = (ing: Ingredient) =>
      router.push(`/admin/ingredients/view/${ing.id}`)

  /* ───────── table columns ───────── */
  const columns = createColumns<Ingredient>({
    columns: [
      {
        id: "image",
        header: "Image",
        cell: ({ row }) => (
            <CellComponents.Image
                src={row.original.imageUrl || ""}
                alt={row.original.name}
            />
        ),
      },
      { id: "name", header: "Name", accessorKey: "name" },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => row.original.type?.name ?? '—',
      },
      {
        id: 'subType',
        header: 'Sub-type',
        cell: ({ row }) => row.original.subType?.name ?? '—',
      },
      {
        id: "isAlcoholic",
        header: "Alcoholic",
        accessorKey: "isAlcoholic",
        cell: ({ row }) => (
            <CellComponents.Boolean value={!!row.original.isAlcoholic} />
        ),
      },
      {
        id: "abv",
        header: "ABV %",
        accessorKey: "abv",
        cell: ({ row }) =>
            row.original.abv != null ? `${row.original.abv}%` : "—",
      },
    ],
    viewRoute: "/admin/ingredients/view",
    editRoute: "/admin/ingredients/edit",
    onDelete: handleDelete,
  })

    if (isError) {
        return (
            <div className="text-center mt-8 p-4 border rounded-md">
                <p className="text-red-500">
                    {error instanceof Error ? error.message : 'Error loading ingredients.'}
                </p>
            </div>
        )
    }

  /* ───────── render ───────── */
  return (
      <div className="container mx-auto py-10">
          <DataTable
              columns={columns}
              data={ingredients}
              searchColumn="name"
              searchValue={search}
              onSearchChange={handleSearchChange}
              searchPlaceholder={'Find an ingredient...'}
              createButtonLink="/admin/ingredients/create"
              createButtonLabel="New Ingredient"
              pageTitle="Ingredients"
              pageDescription="Manage ingredients"
              totalItems={totalItems}
              isLoading={isLoading}
              onRowDoubleClick={handleRowDoubleClick}
              pagination={{
                  pageIndex: page - 1,
                  pageSize: limit,
                  setPageIndex: index => {
                      const params = new URLSearchParams(searchParams.toString())
                      params.set('page', String(index + 1))
                      router.push(`${pathname}?${params.toString()}`)
                  },
                  setPageSize: size => {
                      const params = new URLSearchParams(searchParams.toString())
                      params.set('limit', String(size))
                      params.set('page', '1')
                      router.push(`${pathname}?${params.toString()}`)
                  },
              }}
              isFetching={isFetching}
          />

        {!isLoading && ingredients.length === 0 && (
            <EmptyState icon={PackageOpen} heading="No ingredients found" body="Check your search criteria or add a new ingredient." size="section" />
        )}
      </div>
  )
}
