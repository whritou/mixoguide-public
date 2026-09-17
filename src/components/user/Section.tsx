import type { ElementType, ReactNode } from 'react'

interface SectionProps {
    icon: ElementType
    title: string
    children: ReactNode
    danger?: boolean
}

export function Section({ icon: Icon, title, children, danger = false }: SectionProps) {
    return (
        <div className={`rounded-2xl p-6 ${danger ? 'bg-[#fff8f7] border border-mg-danger/10' : 'bg-mg-smoke'}`}>
            <div className="flex items-center gap-2 mb-5">
                <Icon size={16} className={danger ? 'text-mg-danger' : 'text-mg-brown'} />
                <h2 className={`font-headline text-lg ${danger ? 'text-mg-danger' : 'text-mg-ink'}`}>{title}</h2>
            </div>
            {children}
        </div>
    )
}
