'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GenericView } from '@/components/crud/GenericView'
import type { FieldConfig } from '@/components/crud/types'

import {useGlassQuery} from "@/hooks/queries/use-glasses";

export default function ViewGlassPage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const { data: glass, isLoading, isError, error } = useGlassQuery(id)

    const fields: FieldConfig[] = [
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea' },
    ]

    if (!glass) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-muted-foreground">Glass not found</p>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-danger">
                    {error instanceof Error ? error.message : 'Error loading glass'}
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <Button variant="outline" onClick={() => router.back()} size="sm" className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-line text-fg-muted hover:bg-surface-subtle hover:text-fg-secondary hover:border-brand-soft/40">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            <GenericView
                fields={fields}
                data={glass}
                title={glass.name}
                description={glass.description || 'No description'}
                imageField={{ name: 'imageUrl', label: 'Image' }}
                isLoading={isLoading}
                layout="custom"
                customLayout={{
                    leftColumn: ['name', 'description'],
                    rightColumn: 'image',
                }}
            />
        </div>
    )
}