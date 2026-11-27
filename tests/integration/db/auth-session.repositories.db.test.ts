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

    it('creates, rotates, and revokes refresh tokens', async () => {
        const user = await createUser()
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
        const hashedToken = 'hashed-refresh-token-1'

        await refreshTokenRepository.create(user.id, hashedToken, 'device-a', expiresAt)

        const validBeforeRotate = await refreshTokenRepository.findValid(hashedToken)
        expect(validBeforeRotate?.userId).toBe(user.id)

        const rotated = await refreshTokenRepository.rotate(hashedToken, 'hashed-refresh-token-1b', 'device-b', expiresAt)
        expect(rotated).toEqual({ status: 'rotated', userId: user.id })
        expect(await refreshTokenRepository.findValid(hashedToken)).toBeNull()
        expect((await refreshTokenRepository.findValid('hashed-refresh-token-1b'))?.deviceId).toBe('device-b')

        await refreshTokenRepository.revoke('hashed-refresh-token-1b')
        expect(await refreshTokenRepository.findValid('hashed-refresh-token-1b')).toBeNull()
    })

    it('allows only one of two concurrent rotations of the same token', async () => {
        const user = await createUser()
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
        await refreshTokenRepository.create(user.id, 'race-token', 'device-a', expiresAt)

        const results = await Promise.all([
            refreshTokenRepository.rotate('race-token', 'race-next-1', 'device-a', expiresAt),
            refreshTokenRepository.rotate('race-token', 'race-next-2', 'device-a', expiresAt),
        ])
        expect(results.filter((r) => r.status === 'rotated')).toHaveLength(1)
    })

    it('revokes the whole family when a long-revoked token is reused', async () => {
        const user = await createUser()
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
        await refreshTokenRepository.create(user.id, 'stolen-token', 'device-a', expiresAt)
        await refreshTokenRepository.rotate('stolen-token', 'legit-next', 'device-a', expiresAt)
        // Simulate the reuse happening well after the grace window.
        await prisma.refreshToken.update({
            where: { hashedToken: 'stolen-token' },
            data: { revokedAt: new Date(Date.now() - 10 * 60 * 1000) },
        })

        const reuse = await refreshTokenRepository.rotate('stolen-token', 'attacker-next', 'device-x', expiresAt)
        expect(reuse.status).toBe('reused')
        expect(await refreshTokenRepository.findValid('legit-next')).toBeNull()
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
