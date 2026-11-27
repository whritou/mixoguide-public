import { Suspense } from 'react'
import Loader from '@/components/ui/Loader'
import IngredientsClientView from './IngredientsClientView'

function PageSkeleton() {
    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center">
            <Loader />
        </div>
    )
}

/** Static server shell; the filterable list is a client island (see IngredientsClientView). */
export default function IngredientPage() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <IngredientsClientView />
        </Suspense>
    )
}
