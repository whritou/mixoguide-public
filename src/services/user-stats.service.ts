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

// ─── Calendar helpers (pure date-string arithmetic, DST-safe) ───────────────

/** Server timezone: keeps the historical behaviour when the client sends none. */
function defaultTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** Returns a valid IANA timezone, falling back to the server timezone. */
export function resolveTimeZone(tz?: string | null): string {
    if (!tz) return defaultTimeZone()
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz })
        return tz
    } catch {
        return defaultTimeZone()
    }
}

/** YYYY-MM-DD of `d` in timezone `tz`. */
export function toDateStrInZone(d: Date, tz: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d)
}

function parseDay(day: string): Date {
    const [y, m, d] = day.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

function formatDay(d: Date): string {
    return d.toISOString().slice(0, 10)
}

function addDays(day: string, n: number): string {
    const d = parseDay(day)
    d.setUTCDate(d.getUTCDate() + n)
    return formatDay(d)
}

/** Sunday-based week start of a YYYY-MM-DD day. */
function weekStartOf(day: string): string {
    return addDays(day, -parseDay(day).getUTCDay())
}

/** Compute current + longest consecutive-day streaks from a set of active date strings. */
export function computeStreaks(activeDates: Set<string>, today: string): { current: number; longest: number } {
    if (activeDates.size === 0) return { current: 0, longest: 0 }

    const sorted = [...activeDates].sort()
    let longest = 1, run = 1
    for (let i = 1; i < sorted.length; i++) {
        if (addDays(sorted[i - 1], 1) === sorted[i]) {
            run++
            if (run > longest) longest = run
        } else {
            run = 1
        }
    }

    // Current streak: count backwards from today; also accept yesterday as the
    // start (don't break the streak mid-day).
    let probe = activeDates.has(today) ? today : addDays(today, -1)
    let current = 0
    while (activeDates.has(probe)) {
        current++
        probe = addDays(probe, -1)
    }

    return { current, longest }
}

class UserStatsService {
    /**
     * Aggregates are computed in SQL (DB-011): only one row per active day and
     * the top cocktails are loaded, not every log. `tz` (IANA, optional)
     * controls day boundaries; it defaults to the server timezone.
     */
    async getStats(userId: string, tz?: string | null): Promise<UserStats> {
        const zone = resolveTimeZone(tz)
        const today = toDateStrInZone(new Date(), zone)
        const weekStart  = weekStartOf(today)
        const monthStart = `${today.slice(0, 7)}-01`
        const yearStart  = `${today.slice(0, 4)}-01-01`

        const { days, top } = await cocktailMadeLogRepository.getStatsAggregates(userId, zone, 5)

        // ── Totals + active days ──────────────────────────────────────────────
        let thisWeek = 0, thisMonth = 0, thisYear = 0, allTime = 0
        const activeDates = new Set<string>()
        for (const { day, drinks } of days) {
            allTime += drinks
            if (day >= yearStart)  thisYear  += drinks
            if (day >= monthStart) thisMonth += drinks
            if (day >= weekStart)  thisWeek  += drinks
            activeDates.add(day)
        }

        // ── Streaks ───────────────────────────────────────────────────────────
        const { current: currentStreak, longest: longestStreak } = computeStreaks(activeDates, today)

        // ── Top 5 cocktails ───────────────────────────────────────────────────
        const display = await cocktailMadeLogRepository.findDisplayForCocktailKeys(
            userId,
            top.map((t) => t.cocktailKey),
        )
        const liveById = new Map(display.live.map((c) => [c.id, c]))
        const archivedById = new Map<string, { name: string; imageUrl: string | null }>()
        for (const row of display.archived) {
            const snapshot = parseArchivedCocktailSnapshot(row.snapshot)
            if (snapshot) archivedById.set(row.id, snapshot)
        }
        const topCocktails: TopCocktail[] = []
        for (const { cocktailKey, count } of top) {
            if (topCocktails.length >= 5) break
            const live = liveById.get(cocktailKey)
            if (live) {
                topCocktails.push({ cocktailId: cocktailKey, name: live.name, imageUrl: live.imageUrl ?? null, count, archived: false })
                continue
            }
            const snapshot = archivedById.get(cocktailKey)
            if (snapshot) {
                topCocktails.push({ cocktailId: cocktailKey, name: snapshot.name, imageUrl: snapshot.imageUrl, count, archived: true })
            }
        }

        // ── Weekly trend (last 12 weeks) ──────────────────────────────────────
        const weeklyMap = new Map<string, number>()
        for (let i = 11; i >= 0; i--) weeklyMap.set(addDays(weekStart, -7 * i), 0)
        for (const { day, drinks } of days) {
            const key = weekStartOf(day)
            if (weeklyMap.has(key)) weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + drinks)
        }
        const weeklyTrend: WeeklyPoint[] = [...weeklyMap.entries()].map(([dateStr, drinks]) => {
            const [, month, day] = dateStr.split('-')
            return { label: `${day}-${month}`, drinks }
        })

        // ── Monthly trend (last 12 months) ────────────────────────────────────
        const monthlyMap = new Map<string, number>()
        const [curYear, curMonth] = today.split('-').map(Number)
        for (let i = 11; i >= 0; i--) {
            monthlyMap.set(formatDay(new Date(Date.UTC(curYear, curMonth - 1 - i, 1))).slice(0, 7), 0)
        }
        for (const { day, drinks } of days) {
            const key = day.slice(0, 7)
            if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + drinks)
        }
        const monthlyTrend: MonthlyPoint[] = [...monthlyMap.entries()].map(([key, drinks]) => {
            const [year, month] = key.split('-').map(Number)
            const label = new Date(Date.UTC(year, month - 1, 1))
                .toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
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
