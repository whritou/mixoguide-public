import { prisma } from '@/lib/db/prisma'

export class RefreshTokenRepository {
    async create(userId: string, hashedToken: string, deviceId: string, expiresAt: Date) {
        return prisma.refreshToken.create({
            data: { userId, hashedToken, deviceId, expiresAt },
        })
    }

    async findValid(hashedToken: string) {
        return prisma.refreshToken.findFirst({
            where: {
                hashedToken,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
        })
    }

    async revoke(hashedToken: string) {
        return prisma.refreshToken.updateMany({
            where: { hashedToken },
            data: { revokedAt: new Date() },
        })
    }

    async extendExpiry(hashedToken: string, deviceId: string, expiresAt: Date) {
        return prisma.refreshToken.updateMany({
            where: { hashedToken, revokedAt: null },
            data: { deviceId, expiresAt },
        })
    }

    async revokeAllForUser(userId: string) {
        return prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        })
    }
}

export const  refreshTokenRepository = new RefreshTokenRepository()
