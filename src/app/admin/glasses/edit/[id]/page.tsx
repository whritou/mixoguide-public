'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Loader from '@/components/ui/Loader'
import { GenericForm } from '@/components/crud/GenericForm'

import { useGlassMutations } from '@/hooks/mutations/use-glass-mutations'
import {useGlassQuery} from "@/hooks/queries/use-glasses";

import { fields, GlassFormData } from '@/types/models/glass'

export default function EditGlassPage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const { data: glass, isLoading: glassLoading, isError, error } = useGlassQuery(id)
    const { update } = useGlassMutations()

    const [defaultValues, setDefaultValues] = useState<GlassFormData | null>(null)

    useEffect(() => {
        if (!glass) return
        setDefaultValues({
            name:          glass.name,
            description:   glass.description,
            imageUrl:      glass.imageUrl,
        })
    }, [glass])

    const handleSubmit = async (data: GlassFormData) => {
        try {
            const updated = await update.mutateAsync({ id, data })
            if (!updated) throw new Error('Failed to update glass')

            toast.success('Glass updated successfully')
            router.push('/admin/glasses')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error updating glass')
        }
    }

    if (glassLoading) {
        return <div className="container mx-auto py-10 h-40 flex items-center justify-center"><Loader variant="spinner" /></div>
    }

    if (isError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-red-500">
                    {error instanceof Error ? error.message : 'Error loading glass'}
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <Button variant="outline" onClick={() => router.back()} size="sm" className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-mg-sand text-mg-muted hover:bg-mg-linen hover:text-mg-charcoal hover:border-mg-caramel/40">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            <div className="max-w-2xl mx-auto">
                {defaultValues ? (
                    <GenericForm<GlassFormData>
                        fields={fields}
                        defaultValues={defaultValues}
                        onSubmit={handleSubmit}
                        onCancel={() => router.back()}
                        isLoading={glassLoading}
                        title="Edit Glass"
                        description="Modify the details of the glass"
                        submitButtonLabel="Save changes"
                    />
                ) : (
                    <div className="text-center p-6 border rounded-md">
                        <p className="text-muted-foreground">Glass not found</p>
                    </div>
                )}
            </div>
        </div>
    )
}