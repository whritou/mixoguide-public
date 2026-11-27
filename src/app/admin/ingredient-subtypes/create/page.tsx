'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { GenericForm } from '@/components/crud/GenericForm'
import type { FieldConfig } from '@/components/crud/types'
import { useIngredientSubTypeMutations } from '@/hooks/mutations/use-ingredient-subtype-mutations'
import { useIngredientTypesQuery } from '@/hooks/queries/use-ingredient-types'

interface IngredientSubTypeFormData {
    name: string
    typeId: string
}

export default function CreateIngredientSubTypePage() {
    const router = useRouter()
    const { create } = useIngredientSubTypeMutations()
    const { data: typeData, isLoading: typesLoading } = useIngredientTypesQuery({ limit: 500, sortBy: 'name' })

    const [submitting, setSubmitting] = useState(false)
    const typeOptions = (typeData?.items ?? []).map((type) => ({ label: type.name, value: type.id }))
    const fields: FieldConfig[] = [
        {
            name:        'typeId',
            label:       'Ingredient type',
            type:        'select',
            required:    true,
            options:     typeOptions,
            placeholder: typesLoading ? 'Loading types...' : 'Select an ingredient type',
            description: 'Choose the parent type this sub-type belongs to.',
        },
        { name: 'name', label: 'Sub-type name', type: 'text', required: true },
    ]

    const handleSubmit = async (data: IngredientSubTypeFormData) => {
        setSubmitting(true)
        try {
            const created = await create.mutateAsync(data)
            if (!created) throw new Error('Failed to create sub type')
            toast.success('Ingredient sub type created successfully')
            router.push('/admin/ingredient-subtypes')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error creating sub type')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="container mx-auto py-10">
            <Button variant="outline" onClick={() => router.back()} size="sm" className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-line text-fg-muted hover:bg-surface-subtle hover:text-fg-secondary hover:border-brand-soft/40">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            <div className="max-w-2xl mx-auto">
                <GenericForm<IngredientSubTypeFormData>
                    fields={fields}
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                    isLoading={typesLoading || submitting}
                    title="Create a new ingredient sub type"
                    description="Add a secondary category under an existing ingredient type."
                    submitButtonLabel="Create"
                />
            </div>
        </div>
    )
}
