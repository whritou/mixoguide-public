'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { PackageOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable } from '@/components/data-table/data-table'
import { createColumns } from '@/components/data-table/columns'
import { useIngredientTypeMutations } from '@/hooks/mutations/use-ingredient-type-mutations'
import type { IngredientType } from '@/types/models/ingredient-type'
import {useIngredientTypesQuery} from "@/hooks/queries/use-ingredient-types";

export default function IngredientTypePage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const search = searchParams.get('search') || ''
    const page   = Number(searchParams.get('page') || '1')
    const limit  = Number(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'name'

    const queryParams = useMemo(() => ({ search, page, limit, sortBy }), [search, page, limit, sortBy])

    const { data, isLoading, isError, error, isFetching } = useIngredientTypesQuery(queryParams)

    const ingredientTypes = data?.items ?? []
    const meta = data?.meta

    const { remove } = useIngredientTypeMutations()

    const handleDelete = async (id: string) => {
        try {
            await remove.mutateAsync(id)
            toast.success('Type deleted successfully.')
        } catch {
            toast.error('Error deleting type')
        }
    }

    const columns = createColumns<IngredientType>({
        columns: [
            { id: 'name', header: 'Name', accessorKey: 'name' }
        ],
        viewRoute: '/admin/ingredient-types/view',
        editRoute: '/admin/ingredient-types/edit',
        onDelete: handleDelete
    })

    const handleSearchChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set('search', value)
        else params.delete('search')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const handleRowDoubleClick = (ing: IngredientType) =>
        router.push(`/admin/ingredients-types/view/${ing.id}`)

    if (isError) {
        return (
            <div className="text-center mt-8 p-4 border rounded-md">
                <p className="text-danger">
                    {error instanceof Error ? error.message : 'Error loading ingredient types'}
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10">
            <DataTable
                columns={columns}
                data={ingredientTypes}
                searchValue={search}
                onSearchChange={handleSearchChange}
                searchColumn="name"
                createButtonLink="/admin/ingredient-types/create"
                createButtonLabel="New Type"
                pageTitle="Ingredient Types"
                pageDescription="Manage ingredient categories"
                totalItems={meta?.total || 0}
                isLoading={isLoading}
                isFetching={isFetching}
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
            />

            {!isLoading && ingredientTypes.length === 0 && (
                <EmptyState icon={PackageOpen} heading="No ingredient types found" body="Check your search criteria or add a new type." size="section" />
            )}
        </div>
    )
}