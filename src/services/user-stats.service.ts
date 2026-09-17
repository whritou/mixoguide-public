import { cocktailMadeLogRepository } from '@/repositories/cocktail-made-log.repository'
import { parseArchivedCocktailSnapshot } from '@/lib/cocktails/cocktailMadeLogArchive'

export interface WeeklyPoint  { label: string; drinks: number }
export interface MonthlyPoint { label: string; drinks: number }
export interface TopCocktail  { cocktailId: string; name: string; imageUrl: string | null; count: number; archived: boolean }

export interface UserStats {
    thisWeek:     number
    thisMonth:    number
    thisYear:     number
    allTime:      number
    currentStreak: number
    longestStreak: number
    topCocktails:  TopCocktail[]
    weeklyTrend:   WeeklyPoint[]
    monthlyTrend:  MonthlyPoint[]
}

function startOf(unit: 'week' | 'month' | 'year'): Date {
    const d = new Date()
    if (unit === 'week') {
        const day = d.getDay()
        d.setDate(d.getDate() - day)
    } else if (unit === 'month') {
        d.setDate(1)
    } else {
        d.setMonth(0, 1)
    }
    d.setHours(0, 0, 0, 0)
    return d
}

function startOfDay(d: Date): Date {
    const out = new Date(d)
    out.setHours(0, 0, 0, 0)
    return out
}

function startOfWeek(d: Date): Date {
    const out = startOfDay(d)
    out.setDate(out.getDate() - out.getDay())
    return out
}

/** Local date key YYYY-MM-DD for a Date */
function toDateStr(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

/** Compute current + longest consecutive-day streaks from a set of active date strings */
function computeStreaks(activeDates: Set<string>): { current: number; longest: number } {
    if (activeDates.size === 0) return { current: 0, longest: 0 }

    const sorted = [...activeDates].sort()
    let longest = 1, run = 1
    for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1])
        prev.setDate(prev.getDate() + 1)
        if (toDateStr(prev) === sorted[i]) {
            run++
            if (run > longest) longest = run
        } else {
            run = 1
        }
    }

    // Current streak: count backwards from today
    let current = 0
    const today = toDateStr(new Date())
    let probe = new Date()
    while (activeDates.has(toDateStr(probe))) {
        current++
        probe.setDate(probe.getDate() - 1)
    }
    // Also accept yesterday as start (don't break streak mid-day)
    if (current === 0) {
        probe = new Date()
        probe.setDate(probe.getDate() - 1)
        while (activeDates.has(toDateStr(probe))) {
            current++
            probe.setDate(probe.getDate() - 1)
        }
    }
    void today

    return { current, longest }
}

class UserStatsService {
    async getStats(userId: string): Promise<UserStats> {
        const now       = new Date()
        const weekStart  = startOf('week')
        const monthStart = startOf('month')
        const yearStart  = startOf('year')
        const twelveWeeksAgo  = new Date(now); twelveWeeksAgo.setDate(now.getDate() - 7 * 12)
        const twelveMonthsAgo = new Date(now); twelveMonthsAgo.setMonth(now.getMonth() - 11, 1)

        const [allLogs, recentLogs] = await Promise.all([
            cocktailMadeLogRepository.findAllByUserForStats(userId),
            cocktailMadeLogRepository.findByUserSince(userId, twelveWeeksAgo),
        ])

        // ── Totals ────────────────────────────────────────────────────────────
        let thisWeek = 0, thisMonth = 0, thisYear = 0, allTime = 0
        const activeDates = new Set<string>()
        const countByCocktail = new Map<string, { name: string; imageUrl: string | null; count: number; archived: boolean }>()

        for (const log of allLogs) {
            const at = new Date(log.madeAt)
            allTime += log.quantity
            if (at >= yearStart)  thisYear  += log.quantity
            if (at >= monthStart) thisMonth += log.quantity
            if (at >= weekStart)  thisWeek  += log.quantity
            activeDates.add(toDateStr(at))

            const archivedCocktail = parseArchivedCocktailSnapshot(log.archivedCocktail)
            const cocktailId = log.cocktailId ?? archivedCocktail?.id
            const name = log.cocktail?.name ?? archivedCocktail?.name
            if (!cocktailId || !name) continue

            const imageUrl = log.cocktail?.imageUrl ?? archivedCocktail?.imageUrl ?? null
            const archived = !log.cocktail
            const entry = countByCocktail.get(cocktailId) ?? { name, imageUrl, count: 0, archived }
            entry.count += log.quantity
            entry.archived = entry.archived || archived
            countByCocktail.set(cocktailId, entry)
        }

        // ── Streaks ───────────────────────────────────────────────────────────
        const { current: currentStreak, longest: longestStreak } = computeStreaks(activeDates)

        // ── Top 5 cocktails ───────────────────────────────────────────────────
        const topCocktails: TopCocktail[] = [...countByCocktail.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([cocktailId, v]) => ({ cocktailId, ...v }))

        // ── Weekly trend (last 12 weeks) ──────────────────────────────────────
        const weeklyMap = new Map<string, number>()
        const currentWeekStart = startOfWeek(now)
        for (let i = 11; i >= 0; i--) {
            const d = new Date(currentWeekStart)
            d.setDate(d.getDate() - 7 * i)
            weeklyMap.set(toDateStr(d), 0)
        }
        for (const log of recentLogs) {
            const d = startOfWeek(new Date(log.madeAt))
            const key = toDateStr(d)
            if (weeklyMap.has(key)) weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + log.quantity)
        }
        const weeklyTrend: WeeklyPoint[] = [...weeklyMap.entries()].map(([dateStr, drinks]) => {
            const [, month, day] = dateStr.split('-').map(Number)
            const label = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`
            return { label, drinks }
        })

        // ── Monthly trend (last 12 months) ────────────────────────────────────
        const monthlyLogs = allLogs.filter(l => new Date(l.madeAt) >= twelveMonthsAgo)
        const monthlyMap  = new Map<string, number>()
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now)
            d.setMonth(d.getMonth() - i, 1)
            d.setHours(0, 0, 0, 0)
            monthlyMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0)
        }
        for (const log of monthlyLogs) {
            const d   = new Date(log.madeAt)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + log.quantity)
        }
        const monthlyTrend: MonthlyPoint[] = [...monthlyMap.entries()].map(([key, drinks]) => {
            const [year, month] = key.split('-')
            const d = new Date(Number(year), Number(month) - 1, 1)
            const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            return { label, drinks }
        })

        return {
            thisWeek, thisMonth, thisYear, allTime,
            currentStreak, longestStreak,
            topCocktails, weeklyTrend, monthlyTrend,
        }
    }
}

export const userStatsService = new UserStatsService()
