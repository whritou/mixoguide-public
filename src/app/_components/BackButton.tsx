'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

/** History-aware back button: goes back when there is history, else to `fallbackHref`. */
export function BackButton({
    fallbackHref,
    label = 'Back',
    className,
}: {
    fallbackHref: string
    label?: string
    className: string
}) {
    const router = useRouter()
    const handleGoBack = () => {
        if (window.history.length > 1) {
            router.back()
            return
        }
        router.push(fallbackHref)
    }
    return (
        <button type="button" onClick={handleGoBack} className={className}>
            <ArrowLeft size={13} aria-hidden="true" />
            {label}
        </button>
    )
}
