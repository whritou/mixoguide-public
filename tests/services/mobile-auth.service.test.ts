import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRefreshTokenRepository, mockPrisma } = vi.hoisted(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret-test-secret-test-secret'
    return {
    mockRefreshTokenRepository: {
        create: vi.fn(),
        rotate: vi.fn(),
        findValid: vi.fn(),
        revoke: vi.fn(),
        revokeAllForUser: vi.fn(),
    },
    mockPrisma: { user: { findUnique: vi.fn() } },
    }
})

vi.mock('@/repositories/refresh-token.repository', () => ({
    refreshTokenRepository: mockRefreshTokenRepository,
}))
vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

import { mobileAuthService } from '@/services/mobile-auth.service'

const user = { id: 'user-1', email: 'u@example.com', name: 'U', image: null, role: 'USER' as const }

describe('MobileAuthService.rotateRefreshToken', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns a NEW token and consumes the presented one', async () => {
        mockRefreshTokenRepository.rotate.mockResolvedValue({ status: 'rotated', userId: 'user-1' })

        const result = await mobileAuthService.rotateRefreshToken('old-token', 'device-1')

        expect(result.userId).toBe('user-1')
        expect(result.refreshToken).not.toBe('old-token')
        expect(result.refreshToken).toMatch(/^[0-9a-f]{80}$/)
        const [oldHash, newHash, deviceId] = mockRefreshTokenRepository.rotate.mock.calls[0]
        expect(oldHash).not.toBe(newHash)
        expect(oldHash).not.toBe('old-token') // only hashes reach the database
        expect(deviceId).toBe('device-1')
    })

    it.each(['invalid', 'reused'] as const)('rejects a %s token', async (status) => {
        mockRefreshTokenRepository.rotate.mockResolvedValue(
            status === 'reused' ? { status, userId: 'user-1' } : { status },
        )
        await expect(mobileAuthService.rotateRefreshToken('t', 'd')).rejects.toThrow('INVALID_REFRESH_TOKEN')
    })
})

describe('MobileAuthService.decodeAccessToken', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('accepts a token whose sessionVersion matches and takes the role from the DB', async () => {
        const token = await mobileAuthService.createAccessToken({ ...user, sessionVersion: 2 })
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', sessionVersion: 2 })

        const payload = await mobileAuthService.decodeAccessToken(token)
        expect(payload?.id).toBe('user-1')
        expect(payload?.role).toBe('ADMIN')
    })

    it('rejects a token issued before a password change (sessionVersion bumped)', async () => {
        const token = await mobileAuthService.createAccessToken({ ...user, sessionVersion: 1 })
        mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER', sessionVersion: 2 })

        await expect(mobileAuthService.decodeAccessToken(token)).resolves.toBeNull()
    })

    it('rejects a token of a deleted user', async () => {
        const token = await mobileAuthService.createAccessToken(user)
        mockPrisma.user.findUnique.mockResolvedValue(null)

        await expect(mobileAuthService.decodeAccessToken(token)).resolves.toBeNull()
    })
})
