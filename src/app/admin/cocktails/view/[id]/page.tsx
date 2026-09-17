'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GenericView } from '@/components/crud/GenericView'
import { Badge } from '@/components/ui/badge'
import type { FieldConfig } from '@/components/crud/types'
import { useCocktailQuery } from "@/hooks/queries/use-cocktails";

export default function ViewCocktailPage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const { data: cocktail, isLoading, isError, error } = useCocktailQuery(id)

    const badges = (arr?: string[]) =>
        Array.isArray(arr) && arr.length
            ? <div className="flex flex-wrap gap-2">{arr.map((v) => <Badge key={v} variant="secondary">{v}</Badge>)}</div>
            : <span>—</span>

    const fields: FieldConfig[] = [
        { name: 'name',            label: 'Name',             type: 'text'     },
        { name: 'description',     label: 'Description',      type: 'textarea' },
        { name: 'fullDescription', label: 'Full Description', type: 'textarea' },
        {
            name: 'instructions', label: 'Instructions', type: 'custom',
            render: ({ value }) =>
                Array.isArray(value) && value.length
                    ? <div className="whitespace-pre-line">{value.join('\n')}</div>
                    : <span>—</span>,
        },
        { name: 'imageUrl',    label: 'Image',     type: 'image'    },
        { name: 'isAlcoholic', label: 'Alcoholic', type: 'checkbox' },
        {
            name: 'glass', label: 'Glass', type: 'custom',
            render: ({ value }) => <span>{value?.name ?? '—'}</span>,
        },
        {
            name: 'mainAlcohol', label: 'Main Alcohol', type: 'custom',
            render: ({ value }) => <span>{value?.name ?? '—'}</span>,
        },
        { name: 'difficulty',      label: 'Difficulty', type: 'text'   },
        { name: 'preparationTime', label: 'Prep (min)', type: 'number' },
        { name: 'technique', label: 'Technique', type: 'custom', render: ({ value }) => badges(value) },
        { name: 'flavors',   label: 'Flavors',   type: 'custom', render: ({ value }) => badges(value) },
        { name: 'occasions', label: 'Occasions', type: 'custom', render: ({ value }) => badges(value) },
        {
            name: 'tags', label: 'Tags', type: 'custom',
            render: ({ value }) =>
                Array.isArray(value) && value.length
                    ? <div className="flex flex-wrap gap-2">
                        {value.map((t) => (
                            <Badge key={t.tag?.id ?? t.id} variant="secondary">
                                {t.tag?.name ?? t.name}
                            </Badge>
                        ))}
                    </div>
                    : <span>—</span>,
        },
        {
            name: 'barTools', label: 'Bar Tools', type: 'custom',
            render: ({ value }) =>
                Array.isArray(value) && value.length
                    ? <div className="flex flex-wrap gap-2">
                        {value.map((b) => (
                            <Badge key={b.barTool?.id ?? b.id} variant="secondary">
                                {b.barTool?.name ?? b.name}
                            </Badge>
                        ))}
                    </div>
                    : <span>—</span>,
        },
        {
            name: 'ingredients', label: 'Ingredients', type: 'custom',
            render: ({ value }) =>
                Array.isArray(value) && value.length
                    ? <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b">
                            <th className="text-left py-1">Name</th>
                            <th className="text-left py-1">Qty</th>
                            <th className="text-left py-1">Unit</th>
                            <th className="text-left py-1">Opt.</th>
                        </tr>
                        </thead>
                        <tbody>
                        {value.map((row) => (
                            <tr key={row.ingredientId} className="border-b last:border-0">
                                <td className="py-1">{row.ingredient?.name ?? '—'}</td>
                                <td className="py-1">{row.amount   ?? '—'}</td>
                                <td className="py-1">{row.unit     ?? '—'}</td>
                                <td className="py-1">{row.optional ? '✔' : ''}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    : <span>—</span>,
        },
    ]

    if (!cocktail) {
         return (
             <div className="text-center p-6 border rounded-md">
                    <p className="text-muted-foreground">Cocktail not found</p>
             </div>
        )
    }

    if (isError) {
        return (
            <div className="text-center p-6 border rounded-md">
                <p className="text-red-500">
                    {error instanceof Error ? error.message : 'Error loading cocktail'}
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
                data={cocktail}
                title={cocktail.name}
                description={cocktail.description || 'No description'}
                imageField={{ name: 'imageUrl', label: 'Image' }}
                isLoading={isLoading}
                layout="custom"
                customLayout={{
                    leftColumn: [
                        'name','description','fullDescription','instructions',
                        'isAlcoholic','glass','mainAlcohol','difficulty',
                        'preparationTime','technique','flavors','occasions',
                        'barTools','tags','ingredients',
                    ],
                    rightColumn: 'image',
                }}
            />
        </div>
    )
}