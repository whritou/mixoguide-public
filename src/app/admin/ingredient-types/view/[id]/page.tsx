'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GenericView } from '@/components/crud/GenericView'
import type { FieldConfig } from '@/components/crud/types'

import {useIngredientTypeQuery} from "@/hooks/queries/use-ingredient-types";

export default function ViewIngredientTypePage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const { data: ingredientType, isLoading, isError, error } = useIngredientTypeQuery(id)

    const fields: FieldConfig[] = [
        { name: 'name', label: 'Name', type: 'text' },
    ]

    if (!ingredientType) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-muted-foreground">Ingredient type not found</p>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-red-500">
                    {error instanceof Error ? error.message : 'Error loading ingredient type'}
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

            <GenericView
                fields={fields}
                data={ingredientType}
                title={ingredientType.name}
                isLoading={isLoading}
            />
        </div>
    )
}