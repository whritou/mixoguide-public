import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockMadeLogRepo } = vi.hoisted(() => ({
    mockMadeLogRepo: {
        findAllByUserForStats: vi.fn(),
        findByUserSince:       vi.fn(),
    },
}))

vi.mock('@/repositories/cocktail-made-log.repository', () => ({
    cocktailMadeLogRepository: mockMadeLogRepo,
}))

import { userStatsService } from '@/services/user-stats.service'

describe('UserStatsService.getStats', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('counts archived cocktail snapshots when the live cocktail was deleted', async () => {
        const madeAt = new Date('2026-05-18T20:00:00.000Z')
        mockMadeLogRepo.findAllByUserForStats.mockResolvedValue([
            {
                madeAt,
                quantity: 1,
                cocktailId: 'martini',
                archivedCocktail: null,
                cocktail: { name: 'Martini', imageUrl: '/martini.png' },
            },
            {
                madeAt,
                quantity: 2,
                cocktailId: null,
                archivedCocktail: {
                    id: 'old-fashioned',
                    name: 'Old Fashioned',
                    imageUrl: null,
                    difficulty: 'easy',
                },
                cocktail: null,
            },
        ])
        mockMadeLogRepo.findByUserSince.mockResolvedValue([
            { madeAt, quantity: 1 },
            { madeAt, quantity: 2 },
        ])

        const stats = await userStatsService.getStats('user-1')

        expect(mockMadeLogRepo.findAllByUserForStats).toHaveBeenCalledWith('user-1')
        expect(stats.allTime).toBe(3)
        expect(stats.topCocktails).toEqual([
            { cocktailId: 'old-fashioned', name: 'Old Fashioned', imageUrl: null, count: 2, archived: true },
            { cocktailId: 'martini', name: 'Martini', imageUrl: '/martini.png', count: 1, archived: false },
        ])
    })
})
