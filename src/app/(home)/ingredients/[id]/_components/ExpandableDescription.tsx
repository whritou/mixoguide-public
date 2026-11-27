'use client'

import { useState } from 'react'

/**
 * Shows `preview` (server-computed) with a Read more / Show less toggle. Both
 * texts are in the initial payload, so the full description is indexable.
 */
export function ExpandableDescription({ full, preview }: { full: string; preview: string }) {
    const [expanded, setExpanded] = useState(false)
    const canExpand = preview !== full

    return (
        <div className="ml-8 mb-6 max-w-prose">
            <p className="font-title" id="ingredient-description">
                {expanded || !canExpand ? full : preview}
            </p>

            {canExpand && (
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls="ingredient-description"
                    onClick={() => setExpanded(prev => !prev)}
                    className="mt-2 text-xs uppercase tracking-widest text-fg-on-brand/90 underline hover:text-fg-on-brand transition-colors"
                >
                    {expanded ? 'Show less' : 'Read more'}
                </button>
            )}
        </div>
    )
}
