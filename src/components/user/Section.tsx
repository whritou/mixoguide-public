import type { ElementType, ReactNode } from 'react'

interface SectionProps {
    icon: ElementType
    title: string
    children: ReactNode
    danger?: boolean
}

export function Section({ icon: Icon, title, children, danger = false }: SectionProps) {
    return (
        <div className={`rounded-2xl p-6 ${danger ? 'bg-danger-bg/20 border border-danger/10' : 'bg-surface-hover'}`}>
            <div className="flex items-center gap-2 mb-5">
                <Icon size={16} className={danger ? 'text-danger' : 'text-brand'} />
                <h2 className={`font-headline text-lg ${danger ? 'text-danger' : 'text-fg'}`}>{title}</h2>
            </div>
            {children}
        </div>
    )
}
