'use client'

import { useEffect, useState } from 'react'
import type { CocktailDayGroup } from '@/lib/planner-dashboard/plannerDashboardSelectors'

export type { CocktailDayGroup }

export type PlannerView = 'planned' | 'made' | 'collections' | 'calendar'

export function normalizePlannerView(value: string | null): PlannerView {
    if (value === 'dashboard') return 'calendar'
    if (value === 'planned' || value === 'made' || value === 'collections' || value === 'calendar') return value
    return 'calendar'
}

export function useLiveNow(refreshMs = 60_000): Date {
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), refreshMs)
        return () => clearInterval(timer)
    }, [refreshMs])

    return now
}
