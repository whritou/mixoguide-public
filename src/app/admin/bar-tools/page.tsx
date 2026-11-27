'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { PackageOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

import { DataTable } from '@/components/data-table/data-table'
import { createColumns, CellComponents } from '@/components/data-table/columns'
import { useBarToolMutations } from '@/hooks/mutations/use-bar-tool-mutations'
import { useBarToolsQuery } from "@/hooks/queries/use-bar-tools"
import { BarTool } from "@/types/models/bartool"

export default function BarToolsPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const search = searchParams.get('search') || ''
    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'name'

    const queryParams = useMemo(() => ({ search, page, limit, sortBy }), [search, page, limit, sortBy])

    const {
        data,
        isLoading,
        isError,
        error,
        isFetching,
    } = useBarToolsQuery(queryParams)

    const barTools = data?.items ?? []
    const meta = data?.meta
    const totalItems = meta?.total ?? 0

    const { remove } = useBarToolMutations()

    const handleDelete = async (id: string) => {
        try {
            await remove.mutateAsync(id)
            toast.success('Bar tool deleted successfully.')
        } catch {
            toast.error('Error deleting bar tool')
        }
    }

    const handleSearchChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set('search', value)
        else params.delete('search')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const handleRowDoubleClick = (barTool: BarTool) => {
        router.push(`/admin/bar-tools/view/${barTool.id}`)
    }

    const columns = createColumns<BarTool>({
        columns: [
            {
                id: 'image',
                header: 'Image',
                cell: ({ row }) => (
                    <CellComponents.Image
                        src={row.original.imageUrl || ''}
                        alt={row.original.name}
                    />
                ),
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
                cell: ({ row }) => (
                    <div>{row.original.description || 'No description'}</div>
                ),
            },
            {
                id: 'type',
                header: 'Type',
                accessorKey: 'type',
                cell: ({ row }) => (
                    <div>{row.original.type || 'No type'}</div>
                ),
            },
            {
                id: 'isEssential',
                header: 'Essential',
                accessorKey: 'isEssential',
                cell: ({ row }) => (
                    <div>{row.original.isEssential ? 'Yes' : 'No'}</div>
                ),
            },
        ],
        viewRoute: '/admin/bar-tools/view',
        editRoute: '/admin/bar-tools/edit',
        onDelete: handleDelete,
    })

    if (isError) {
        return (
            <div className="text-center mt-8 p-4 border rounded-md">
                <p className="text-danger">
                    {error instanceof Error ? error.message : 'Error loading bar tools'}
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10">
            <DataTable
                columns={columns}
                data={barTools}
                searchColumn="name"
                searchValue={search}
                onSearchChange={handleSearchChange}
                searchPlaceholder="Find a bar tool..."
                createButtonLink="/admin/bar-tools/create"
                createButtonLabel="New Bar Tool"
                pageTitle="Bar Tools"
                pageDescription="Manage your bar tools."
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

            {!isLoading && barTools.length === 0 && (
                <EmptyState icon={PackageOpen} heading="No bar tools found" body="Check your search criteria or add a new bar tool." size="section" />
            )}
        </div>
    )
}