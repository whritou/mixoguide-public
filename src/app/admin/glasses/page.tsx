'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { PackageOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

import { DataTable } from '@/components/data-table/data-table'
import { createColumns, CellComponents } from '@/components/data-table/columns'
import { useGlassMutations } from '@/hooks/mutations/use-glass-mutations'
import { Glass } from "@/types/models/glass";
import {useGlassesQuery} from "@/hooks/queries/use-glasses";

export default function GlassesPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const search = searchParams.get('search') || ''
    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'name'

    const queryParams = useMemo(() => ({ search, page, limit, sortBy }), [search, page, limit, sortBy])

    const { data, isLoading, isFetching, isError, error } = useGlassesQuery(queryParams)

    const glasses = data?.items ?? []
    const totalItems = data?.meta?.total || 0

    const { remove } = useGlassMutations()

    const handleDelete = async (id: string) => {
        try {
            await remove.mutateAsync(id)
            toast.success('Glass deleted successfully.')
        } catch {
            toast.error('Error deleting glass')
        }
    }

    const handleSearchChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set('search', value)
        else params.delete('search')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const handleRowDoubleClick = (glass: Glass) => {
        router.push(`/admin/glasses/view/${glass.id}`)
    }

    const columns = createColumns<Glass>({
        columns: [
            {
                id: 'image',
                header: 'Image',
                cell: ({ row }) => <CellComponents.Image src={row.original.imageUrl || ''} alt={row.original.name} />,
            },
            {
                id: 'name',
                header: 'Name',
                accessorKey: 'name',
                cell: ({ row }) => <div>{row.original.name || 'No name'}</div>,
            },
            {
                id: 'description',
                header: 'Description',
                accessorKey: 'description',
                cell: ({ row }) => <div>{row.original.description || 'No description'}</div>,
            },
        ],
        viewRoute: '/admin/glasses/view',
        editRoute: '/admin/glasses/edit',
        onDelete: handleDelete,
    })

    if (isError) {
        return (
            <div className="text-center mt-8 p-4 border rounded-md">
                <p className="text-danger">
                    {error instanceof Error ? error.message : 'Error loading glasses'}
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10">
            <DataTable
                columns={columns}
                data={glasses}
                searchColumn="name"
                searchValue={search}
                onSearchChange={handleSearchChange}
                searchPlaceholder="Find a glass..."
                createButtonLink="/admin/glasses/create"
                createButtonLabel="New Glass"
                pageTitle="Glasses"
                pageDescription="Manage your glasses."
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

            {!isLoading && glasses.length === 0 && (
                <EmptyState icon={PackageOpen} heading="No glasses found" body="Check your search criteria or add a new glass." size="section" />
            )}
        </div>
    )
}