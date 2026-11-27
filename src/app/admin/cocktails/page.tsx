'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { PackageOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

import { DataTable } from '@/components/data-table/data-table'
import { createColumns, CellComponents } from '@/components/data-table/columns'
import { useCocktailMutations } from '@/hooks/mutations/use-cocktail-mutations'
import type { Cocktail } from '@/types/models/cocktail'
import {useCocktailsQuery} from "@/hooks/queries/use-cocktails";

export default function CocktailsAdminPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const search = searchParams.get('search') || ''
    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'name'

    const queryParams = useMemo(() => ({ search, page, limit, sortBy }), [search, page, limit, sortBy])

    const { data, isLoading, isError, error, isFetching } = useCocktailsQuery(queryParams)

    const cocktails = data?.items ?? []
    const totalItems = data?.meta.total || 0

    const { remove } = useCocktailMutations()

    const handleDelete = async (id: string) => {
        try {
            await remove.mutateAsync(id)
            toast.success('Cocktail deleted successfully.')
        } catch {
            toast.error('Error deleting cocktail')
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

    const handleRowDoubleClick = (c: Cocktail) => {
        router.push(`/admin/cocktails/view/${c.id}`)
    }

    const columns = createColumns<Cocktail>({
        columns: [
            {
                id: 'image',
                header: 'Image',
                enableSorting: false,
                maxWidth: '70px',
                cell: ({ row }) => <CellComponents.Image src={row.original.imageUrl || ''} alt={row.original.name} />,
            },
            { id: 'name', header: 'Name', accessorKey: 'name', maxWidth: '180px' },
            {
                id: 'isAlcoholic',
                header: 'Alcoholic',
                accessorKey: 'isAlcoholic',
                maxWidth: '100px',
                cell: ({ row }) => <CellComponents.Boolean value={!!row.original.isAlcoholic} />,
            },
            { id: 'difficulty', header: 'Difficulty', accessorKey: 'difficulty', maxWidth: '110px' },
            {
                id: 'preparationTime',
                header: 'Prep (min)',
                accessorKey: 'preparationTime',
                maxWidth: '110px',
                cell: ({ row }) => <div>{row.original.preparationTime ?? '—'}</div>,
            },
        ],
        viewRoute: '/admin/cocktails/view',
        editRoute: '/admin/cocktails/edit',
        onDelete: handleDelete,
    })

    if (isError) {
        return (
            <div className="text-center mt-8 p-4 border rounded-md">
                <p className="text-danger">
                    {error instanceof Error ? error.message : 'Error loading cocktails'}
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10">
            <DataTable
                columns={columns}
                data={cocktails}
                searchColumn="name"
                searchValue={search}
                onSearchChange={handleSearchChange}
                searchPlaceholder="Find a cocktail..."
                createButtonLink="/admin/cocktails/create"
                createButtonLabel="New Cocktail"
                pageTitle="Cocktails"
                pageDescription="Browse and manage cocktails"
                onRowDoubleClick={handleRowDoubleClick}
                totalItems={totalItems}
                pagination={{
                    pageIndex: page - 1,
                    pageSize: limit,
                    setPageIndex: (index) => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('page', String(index + 1))
                        router.push(`${pathname}?${params.toString()}`)
                    },
                    setPageSize: (size) => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('limit', String(size))
                        params.set('page', '1')
                        router.push(`${pathname}?${params.toString()}`)
                    },
                }}
                isLoading={isLoading}
                isFetching={isFetching}
            />

            {!isLoading && cocktails.length === 0 && (
                <EmptyState icon={PackageOpen} heading="No cocktails found" body="Check your search criteria or add a new cocktail." size="section" />
            )}
        </div>
    )
}