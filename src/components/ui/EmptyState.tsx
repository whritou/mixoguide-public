import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * size variants:
 *   'page'    — full list-page empty state (py-20, large icon)
 *   'section' — sub-section inside a view (py-10, medium icon)
 *   'card'    — compact, inside a card or modal (py-6, small icon)
 */
type EmptyStateSize = 'page' | 'section' | 'card'

const SIZE = {
    page:    { py: 'py-20', ring: 'w-16 h-16', iconSize: 28, heading: 'text-xl' },
    section: { py: 'py-10', ring: 'w-12 h-12', iconSize: 22, heading: 'text-lg' },
    card:    { py: 'py-6',  ring: 'w-8  h-8',  iconSize: 15, heading: 'text-sm' },
}

interface EmptyStateProps {
    icon: LucideIcon
    heading: string
    /** Plain string or JSX (e.g. with highlighted search term). */
    body?: ReactNode
    /** Optional CTA button / link node. */
    action?: ReactNode
    /** Visual size variant. Defaults to 'page'. */
    size?: EmptyStateSize
    /** Adds a dashed-border + tinted bg container — use for list pages where the empty state replaces the list. */
    bordered?: boolean
    /** Extra classes on the root element (e.g. 'col-span-full' for grid children). */
    className?: string
}

export function EmptyState({
    icon: Icon,
    heading,
    body,
    action,
    size = 'page',
    bordered = false,
    className,
}: EmptyStateProps) {
    const { py, ring, iconSize, heading: headingCls } = SIZE[size]

    return (
        <div
            className={[
                'flex flex-col items-center text-center gap-3',
                py,
                bordered ? 'rounded-2xl border border-dashed border-mg-sand/80 bg-mg-cream/60' : '',
                className ?? '',
            ].join(' ')}
        >
            <div className={`${ring} rounded-full bg-mg-caramel/12 flex items-center justify-center shrink-0`}>
                <Icon size={iconSize} className="text-mg-brown" />
            </div>
            <p className={`font-headline italic ${headingCls} text-mg-ink leading-tight`}>{heading}</p>
            {body && <p className="text-xs text-mg-muted max-w-xs">{body}</p>}
            {action}
        </div>
    )
}
