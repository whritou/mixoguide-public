import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRefreshTokenRepository } = vi.hoisted(() => ({
    mockRefreshTokenRepository: {
        create: vi.fn(),
        extendExpiry: vi.fn(),
        findValid: vi.fn(),
        revoke: vi.fn(),
        revokeAllForUser: vi.fn(),
    },
}))

vi.mock('@/repositories/refresh-token.repository', () => ({
    refreshTokenRepository: mockRefreshTokenRepository,
}))

import { mobileAuthService } from '@/services/mobile-auth.service'

describe('MobileAuthService.renewRefreshToken', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('keeps the same refresh token and extends its expiry', async () => {
        mockRefreshTokenRepository.findValid.mockResolvedValue({
            userId: 'user-1',
        })
        mockRefreshTokenRepository.extendExpiry.mockResolvedValue({ count: 1 })

        const result = await mobileAuthService.renewRefreshToken('refresh-token', 'device-1')

        expect(result).toEqual({ refreshToken: 'refresh-token', userId: 'user-1' })
        expect(mockRefreshTokenRepository.revoke).not.toHaveBeenCalled()
        expect(mockRefreshTokenRepository.create).not.toHaveBeenCalled()
        expect(mockRefreshTokenRepository.extendExpiry).toHaveBeenCalledWith(
            expect.any(String),
            'device-1',
            expect.any(Date),
        )
    })

    it('rejects invalid refresh tokens', async () => {
        mockRefreshTokenRepository.findValid.mockResolvedValue(null)

        await expect(
            mobileAuthService.renewRefreshToken('expired-token', 'device-1')
        ).rejects.toThrow('INVALID_REFRESH_TOKEN')

        expect(mockRefreshTokenRepository.extendExpiry).not.toHaveBeenCalled()
    })
})
