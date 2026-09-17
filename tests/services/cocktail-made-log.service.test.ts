import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForbiddenError, NotFoundError } from '@/utils/errors'

const mockMadeLogRepo = vi.hoisted(() => ({
    findByUser:        vi.fn(),
    create:            vi.fn(),
    findOwnershipById: vi.fn(),
    archiveById:       vi.fn(),
}))

vi.mock('@/repositories/cocktail-made-log.repository', () => ({
    cocktailMadeLogRepository: mockMadeLogRepo,
}))

import { cocktailMadeLogService } from '@/services/cocktail-made-log.service'

describe('CocktailMadeLogService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('passes includeArchived through only when requested', async () => {
        mockMadeLogRepo.findByUser.mockResolvedValue({ data: [], meta: {} })

        await cocktailMadeLogService.getByUser('user-1', 2, 25, true)

        expect(mockMadeLogRepo.findByUser).toHaveBeenCalledWith('user-1', 2, 25, true)
    })

    it('archives an owned made-log entry instead of hard deleting it', async () => {
        mockMadeLogRepo.findOwnershipById.mockResolvedValue({ id: 'log-1', userId: 'user-1' })
        mockMadeLogRepo.archiveById.mockResolvedValue(true)

        await expect(cocktailMadeLogService.delete('log-1', 'user-1', false)).resolves.not.toThrow()

        expect(mockMadeLogRepo.archiveById).toHaveBeenCalledWith('log-1')
    })

    it('does not archive another user made-log entry', async () => {
        mockMadeLogRepo.findOwnershipById.mockResolvedValue({ id: 'log-1', userId: 'other-user' })

        await expect(cocktailMadeLogService.delete('log-1', 'user-1', false)).rejects.toThrow(ForbiddenError)

        expect(mockMadeLogRepo.archiveById).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when the made-log entry does not exist', async () => {
        mockMadeLogRepo.findOwnershipById.mockResolvedValue(null)

        await expect(cocktailMadeLogService.delete('missing-log', 'user-1', false)).rejects.toThrow(NotFoundError)

        expect(mockMadeLogRepo.archiveById).not.toHaveBeenCalled()
    })
})
