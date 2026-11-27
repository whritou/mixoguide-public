'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

import { GenericForm } from '@/components/crud/GenericForm'

import { useGlassMutations } from '@/hooks/mutations/use-glass-mutations'

import { GlassFormData, fields } from '@/types/models/glass'

export default function CreateGlassPage() {
    const router = useRouter()

    const { create } = useGlassMutations()

    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (data: GlassFormData) => {
        setSubmitting(true)

        try {
            const created = await create.mutateAsync(data)

            if (!created) {
                throw new Error('Failed to create glass')
            }

            toast.success('Glass created successfully')

            router.push('/admin/glasses')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error creating glass')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <Button variant="outline" onClick={() => router.back()} size="sm" className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-line text-fg-muted hover:bg-surface-subtle hover:text-fg-secondary hover:border-brand-soft/40">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>

            <div className="max-w-2xl mx-auto">
                <GenericForm<GlassFormData>
                    fields={fields}
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                    isLoading={submitting}
                    title="Create a new glass"
                    description="Add a new glass to the collection"
                    submitButtonLabel="Create"
                />
            </div>
        </div>
    )
}