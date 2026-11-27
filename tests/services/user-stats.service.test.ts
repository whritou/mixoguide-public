import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockMadeLogRepo } = vi.hoisted(() => ({
    mockMadeLogRepo: {
        getStatsAggregates:          vi.fn(),
        findDisplayForCocktailKeys:  vi.fn(),
    },
}))

vi.mock('@/repositories/cocktail-made-log.repository', () => ({
    cocktailMadeLogRepository: mockMadeLogRepo,
}))

import { computeStreaks, resolveTimeZone, toDateStrInZone, userStatsService } from '@/services/user-stats.service'

describe('UserStatsService.getStats', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z')) // Wednesday
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('counts archived cocktail snapshots when the live cocktail was deleted', async () => {
        mockMadeLogRepo.getStatsAggregates.mockResolvedValue({
            days: [{ day: '2026-05-18', drinks: 3 }],
            top: [
                { cocktailKey: 'old-fashioned', count: 2 },
                { cocktailKey: 'martini', count: 1 },
            ],
        })
        mockMadeLogRepo.findDisplayForCocktailKeys.mockResolvedValue({
            live: [{ id: 'martini', name: 'Martini', imageUrl: '/martini.png' }],
            archived: [{
                id: 'old-fashioned',
                snapshot: { id: 'old-fashioned', name: 'Old Fashioned', imageUrl: null, difficulty: 'easy' },
            }],
        })

        const stats = await userStatsService.getStats('user-1', 'UTC')

        expect(mockMadeLogRepo.getStatsAggregates).toHaveBeenCalledWith('user-1', 'UTC', 5)
        expect(stats.allTime).toBe(3)
        expect(stats.topCocktails).toEqual([
            { cocktailId: 'old-fashioned', name: 'Old Fashioned', imageUrl: null, count: 2, archived: true },
            { cocktailId: 'martini', name: 'Martini', imageUrl: '/martini.png', count: 1, archived: false },
        ])
    })

    it('computes week / month / year totals and trends from per-day aggregates', async () => {
        mockMadeLogRepo.getStatsAggregates.mockResolvedValue({
            days: [
                { day: '2025-12-31', drinks: 4 },  // last year
                { day: '2026-04-30', drinks: 2 },  // this year, last month
                { day: '2026-05-02', drinks: 1 },  // this month, earlier week
                { day: '2026-05-19', drinks: 2 },  // this week (week starts Sun 2026-05-17)
                { day: '2026-05-20', drinks: 1 },  // today
            ],
            top: [],
        })
        mockMadeLogRepo.findDisplayForCocktailKeys.mockResolvedValue({ live: [], archived: [] })

        const stats = await userStatsService.getStats('user-1', 'UTC')

        expect(stats).toEqual(expect.objectContaining({
            allTime: 10, thisYear: 6, thisMonth: 4, thisWeek: 3,
            currentStreak: 2, longestStreak: 2,
        }))
        expect(stats.weeklyTrend).toHaveLength(12)
        expect(stats.weeklyTrend[11]).toEqual({ label: '17-05', drinks: 3 })
        expect(stats.monthlyTrend).toHaveLength(12)
        expect(stats.monthlyTrend[11]).toEqual({ label: 'May 26', drinks: 4 })
        expect(stats.monthlyTrend[10]).toEqual({ label: 'Apr 26', drinks: 2 })
    })
})

describe('user-stats calendar helpers', () => {
    it('buckets an instant into the requested timezone', () => {
        const instant = new Date('2026-05-20T23:30:00.000Z')
        expect(toDateStrInZone(instant, 'UTC')).toBe('2026-05-20')
        expect(toDateStrInZone(instant, 'Europe/Paris')).toBe('2026-05-21')
        expect(toDateStrInZone(instant, 'America/Los_Angeles')).toBe('2026-05-20')
    })

    it('falls back to a valid timezone for unknown zones', () => {
        expect(() => toDateStrInZone(new Date(), resolveTimeZone('Not/AZone'))).not.toThrow()
        expect(resolveTimeZone('Europe/Paris')).toBe('Europe/Paris')
    })

    it('computes streaks across a DST change and month boundaries', () => {
        // 2026-03-29 is the EU DST switch: pure date arithmetic must not skip/double a day.
        const days = new Set(['2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31', '2026-04-01'])
        expect(computeStreaks(days, '2026-04-01')).toEqual({ current: 5, longest: 5 })
        expect(computeStreaks(days, '2026-04-02')).toEqual({ current: 5, longest: 5 }) // yesterday still counts
        expect(computeStreaks(days, '2026-04-03')).toEqual({ current: 0, longest: 5 })
    })
})
