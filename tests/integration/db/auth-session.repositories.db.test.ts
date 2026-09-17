import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { deviceRepository } from '@/repositories/device.repository'
import { refreshTokenRepository } from '@/repositories/refresh-token.repository'
import { prisma } from '@/lib/db/prisma'
import { createUser, ensureTestDatabaseUrl, resetDatabase } from './harness'

const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip

describeDb('DB integration: auth/session repositories', () => {
    beforeAll(() => {
        ensureTestDatabaseUrl()
    })

    beforeEach(async () => {
        await resetDatabase()
    })

    it('creates, extends, and revokes refresh tokens', async () => {
        const user = await createUser()
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
        const hashedToken = 'hashed-refresh-token-1'

        await refreshTokenRepository.create(user.id, hashedToken, 'device-a', expiresAt)

        const validBeforeRevoke = await refreshTokenRepository.findValid(hashedToken)
        expect(validBeforeRevoke?.userId).toBe(user.id)

        const nextExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000)
        await refreshTokenRepository.extendExpiry(hashedToken, 'device-b', nextExpiry)

        const afterExtend = await prisma.refreshToken.findFirst({ where: { hashedToken } })
        expect(afterExtend?.deviceId).toBe('device-b')

        await refreshTokenRepository.revoke(hashedToken)
        const validAfterRevoke = await refreshTokenRepository.findValid(hashedToken)
        expect(validAfterRevoke).toBeNull()
    })

    it('revokes all active refresh tokens for a user', async () => {
        const user = await createUser()
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

        await refreshTokenRepository.create(user.id, 'hashed-refresh-token-2', 'device-a', expiresAt)
        await refreshTokenRepository.create(user.id, 'hashed-refresh-token-3', 'device-b', expiresAt)

        await refreshTokenRepository.revokeAllForUser(user.id)

        const active = await prisma.refreshToken.findMany({
            where: { userId: user.id, revokedAt: null },
        })
        expect(active).toHaveLength(0)
    })

    it('upserts and deletes user devices by token', async () => {
        const user = await createUser()
        const token = 'fcm-token-1'

        const created = await deviceRepository.upsert(user.id, token, {
            platform: 'android',
            appVersion: '1.0.0',
        })
        expect(created.fcmToken).toBe(token)

        const updated = await deviceRepository.upsert(user.id, token, {
            platform: 'android',
            appVersion: '1.0.1',
            expoToken: 'expo-token',
        })
        expect(updated.appVersion).toBe('1.0.1')
        expect(updated.expoToken).toBe('expo-token')

        const all = await deviceRepository.findAllForUser(user.id)
        expect(all).toHaveLength(1)

        await deviceRepository.deleteByToken(user.id, token)
        const afterDelete = await deviceRepository.findAllForUser(user.id)
        expect(afterDelete).toHaveLength(0)
    })
})
