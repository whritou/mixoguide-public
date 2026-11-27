'use client'

import { SegmentErrorView } from '@/app/_components/SegmentErrorView'

export default function RootSegmentError({
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
            segment="root"
            eyebrow="Something went wrong"
            heading="An unexpected error occurred"
            body="You can try again or head back home."
            homeHref="/"
            homeLabel="Go home"
        />
    )
}
