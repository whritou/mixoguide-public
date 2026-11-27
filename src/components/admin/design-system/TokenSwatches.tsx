'use client'

import { useEffect, useRef, useState } from 'react'
import { DESIGN_TOKENS } from '@/styles/token-list'

export function TokenSwatches() {
    const ref = useRef<HTMLDivElement>(null)
    const [values, setValues] = useState<Record<string, string>>({})

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const style = getComputedStyle(el)
        setValues(Object.fromEntries(DESIGN_TOKENS.map((t) => [t.name, style.getPropertyValue(`--${t.name}`).trim()])))
    }, [])

    return (
        <div ref={ref} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DESIGN_TOKENS.map((t) => (
                <div key={t.name} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2">
                    <span
                        className="size-10 shrink-0 rounded-md border border-line"
                        style={{ background: `var(--${t.name})` }}
                    />
                    <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-fg">{t.name}</p>
                        <p className="truncate text-[11px] text-fg-muted">{t.role}</p>
                        <p className="truncate font-mono text-[11px] text-fg-dim">{values[t.name] || ' '}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}
