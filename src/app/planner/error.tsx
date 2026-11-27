'use client'

import { SegmentErrorView } from '@/app/_components/SegmentErrorView'

export default function PlannerSegmentError({
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
            segment="planner"
            eyebrow="Planner interrupted"
            heading="Your planner could not be loaded"
            body="Try again, or head back to the dashboard. Your planned cocktails and events are safe."
            homeHref="/"
            homeLabel="Dashboard"
        />
    )
}
