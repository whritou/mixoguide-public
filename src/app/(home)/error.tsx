'use client'

import { SegmentErrorView } from '@/app/_components/SegmentErrorView'

export default function HomeSegmentError({
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
            segment="home"
            eyebrow="Home view interrupted"
            heading="Something spilled behind the bar"
            body="Try reloading this section, or head back to the dashboard while we keep the rest of the app steady."
            homeHref="/"
            homeLabel="Dashboard"
        />
    )
}
