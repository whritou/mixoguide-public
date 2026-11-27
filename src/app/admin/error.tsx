'use client'

import { SegmentErrorView } from '@/app/_components/SegmentErrorView'

export default function AdminSegmentError({
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
            segment="admin"
            eyebrow="Admin view interrupted"
            heading="The admin console hit a snag"
            body="Retry this admin screen, or return to the admin dashboard without losing the rest of your session."
            homeHref="/admin"
            homeLabel="Admin home"
        />
    )
}
