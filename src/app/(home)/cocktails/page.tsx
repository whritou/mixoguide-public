import { Suspense } from 'react'
import Loader from '@/components/ui/Loader'
import CocktailsClientView from './CocktailsClientView'

/**
 * Server shell for /cocktails. The list itself stays a client island
 * (URL-driven filters, infinite scroll, per-user makeable/favorite overlays);
 * the shell remains static so it is served from the edge cache.
 * `useSearchParams` inside the island requires the Suspense boundary.
 */
export default function CocktailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-canvas flex items-center justify-center"><Loader /></div>}>
            <CocktailsClientView />
        </Suspense>
    )
}
