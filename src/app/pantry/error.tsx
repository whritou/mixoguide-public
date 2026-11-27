'use client'

import { SegmentErrorView } from '@/app/_components/SegmentErrorView'

export default function PantrySegmentError({
    error,
    unstable_retry,
}: {
    error: Error & { digest?: string }
    unstable_retry: () => void
}) {
    return (
        <SegmentErrorView
            error={error}
            retry={unstable_retry}
            segment="pantry"
            eyebrow="Pantry interrupted"
            heading="Your pantry could not be loaded"
            body="Try again, or head back to the dashboard. Your pantry items are safe."
            homeHref="/"
            homeLabel="Dashboard"
        />
    )
}
