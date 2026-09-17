'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { GenericForm } from '@/components/crud/GenericForm'

import { useIngredientTypeMutations } from '@/hooks/mutations/use-ingredient-type-mutations'
import type {FieldConfig} from "@/components/crud/types";

interface IngredientTypeFormData {
    name: string
}

const fields: FieldConfig[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
]

export default function CreateIngredientTypePage() {
    const router = useRouter()
    const { create } = useIngredientTypeMutations()

    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (data: IngredientTypeFormData) => {
        setSubmitting(true)
        try {
            const created = await create.mutateAsync(data)
            if (!created) throw new Error('Failed to create  type')
            toast.success('Ingredient type created successfully')
            router.push('/admin/ingredient-types')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error creating type')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <Button variant="outline" onClick={() => router.back()} size="sm" className="h-8 flex rounded-full text-xs font-label uppercase tracking-widest border-mg-sand text-mg-muted hover:bg-mg-linen hover:text-mg-charcoal hover:border-mg-caramel/40">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            <div className="max-w-2xl mx-auto">
                <GenericForm<IngredientTypeFormData>
                    fields={fields}
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                    isLoading={submitting}
                    title="Create a new ingredient type"
                    description="Add a new ingredient type to the collection"
                    submitButtonLabel="Create"
                />
            </div>
        </div>
    )
}