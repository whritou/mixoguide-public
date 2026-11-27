'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import Loader from '@/components/ui/Loader'
import { GenericForm } from '@/components/crud/GenericForm'

import { useBarToolMutations } from '@/hooks/mutations/use-bar-tool-mutations'
import { useBarToolQuery } from '@/hooks/queries/use-bar-tools'

import { BarToolFormData, fields } from "@/types/models/bartool"

export default function EditBarToolPage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const {
        data: barTool,
        isLoading: barToolLoading,
        isError,
        error,
    } = useBarToolQuery(id)

    const { update } = useBarToolMutations()

    const [defaultValues, setDefaultValues] = useState<BarToolFormData | null>(null)

    useEffect(() => {
        if (!barTool) return

        setDefaultValues({
            name: barTool.name,
            description: barTool.description,
            imageUrl: barTool.imageUrl,
            type: barTool.type,
            isEssential: barTool.isEssential,
        })
    }, [barTool])

    const handleSubmit = async (data: BarToolFormData) => {
        try {
            const updated = await update.mutateAsync({ id, data })

            if (!updated) throw new Error('Failed to update bar tool')

            toast.success('Bar tool updated successfully')

            router.push('/admin/bar-tools')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error updating bar tool')
        }
    }

    if (barToolLoading) {
        return <div className="container mx-auto py-10 h-40 flex items-center justify-center"><Loader variant="spinner" /></div>
    }

    if (isError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-danger">
                    {error instanceof Error ? error.message : 'Error loading bar tool'}
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

            <div className="max-w-2xl mx-auto">
                {defaultValues ? (
                    <GenericForm<BarToolFormData>
                        fields={fields}
                        defaultValues={defaultValues}
                        onSubmit={handleSubmit}
                        onCancel={() => router.back()}
                        isLoading={barToolLoading}
                        title="Edit Bar Tool"
                        description="Modify the details of the bar tool"
                        submitButtonLabel="Save changes"
                    />
                ) : (
                    <div className="text-center p-6 border rounded-md">
                        <p className="text-muted-foreground">Bar tool not found</p>
                    </div>
                )}
            </div>
        </div>
    )
}