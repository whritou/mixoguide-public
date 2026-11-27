'use client'

import Link from 'next/link'
import type { PlannerView } from '@/components/home/planned-cocktails/view/plannerViewHelpers'

interface PlannerViewTabsProps {
    activeView: PlannerView
    plannedCount: number
    madeCount: number
    collectionsCount: number
}

type PlannerTab = {
    key: 'planned' | 'made' | 'collections' | 'calendar'
    label: string
    count?: number
    href: string
}

export default function PlannerViewTabs({
    activeView,
    plannedCount,
    madeCount,
    collectionsCount,
}: PlannerViewTabsProps) {
    const tabs: PlannerTab[] = [
        { key: 'calendar',    label: 'Calendar',                          href: '/planner?view=calendar' },
        { key: 'collections', label: 'Events',    count: collectionsCount, href: '/planner?view=collections' },
        { key: 'planned',     label: 'To Make',   count: plannedCount,     href: '/planner?view=planned' },
        { key: 'made',        label: 'Made',       count: madeCount,        href: '/planner?view=made' },
    ]

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex rounded-full bg-line/50 p-1 gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = activeView === tab.key

                    return (
                        <Link
                            key={tab.key}
                            href={tab.href}
                            className={`
                                px-2 sm:px-5 py-2 text-xs font-label uppercase tracking-widest rounded-full transition-all duration-200
                                flex items-center gap-2 whitespace-nowrap shrink-0
                                ${isActive
                                    ? 'bg-surface shadow-sm text-brand font-bold'
                                    : 'text-fg-muted hover:text-fg-secondary'}
                            `}
                        >
                            {tab.label}
                            {typeof tab.count === 'number' && tab.count > 0 && (
                                <span className="text-[10px] font-label bg-brand-soft/15 text-brand rounded-full px-1.5 py-0.5">
                                    {tab.count}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
