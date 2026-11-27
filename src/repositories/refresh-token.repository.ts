import { prisma } from '@/lib/db/prisma'

export type RotationResult =
    | { status: 'rotated'; userId: string }
    | { status: 'invalid' }
    | { status: 'reused'; userId: string }

/** A revoked token presented within this window is treated as a lost response, not theft. */
const REUSE_GRACE_MS = 60_000

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
            where: { hashedToken, revokedAt: null },
            data: { revokedAt: new Date() },
        })
    }

    /**
     * Atomically consume `oldHash` and store `newHash` for the same user (SEC-004).
     *
     * - Valid token  → old row revoked, new row created, `rotated`.
     * - Unknown/expired token → `invalid`.
     * - Already-revoked token → `reused`; outside a short grace window every
     *   active token of that user is revoked (token-theft response).
     */
    async rotate(oldHash: string, newHash: string, deviceId: string, expiresAt: Date): Promise<RotationResult> {
        return prisma.$transaction(async (tx) => {
            const now = new Date()
            const claimed = await tx.refreshToken.updateMany({
                where: { hashedToken: oldHash, revokedAt: null, expiresAt: { gt: now } },
                data: { revokedAt: now },
            })

            const record = await tx.refreshToken.findUnique({
                where: { hashedToken: oldHash },
                select: { userId: true, revokedAt: true },
            })

            if (claimed.count === 1 && record) {
                await tx.refreshToken.create({
                    data: { userId: record.userId, hashedToken: newHash, deviceId, expiresAt },
                })
                return { status: 'rotated', userId: record.userId } as const
            }

            if (!record?.revokedAt) return { status: 'invalid' } as const

            if (now.getTime() - record.revokedAt.getTime() > REUSE_GRACE_MS) {
                await tx.refreshToken.updateMany({
                    where: { userId: record.userId, revokedAt: null },
                    data: { revokedAt: now },
                })
            }
            return { status: 'reused', userId: record.userId } as const
        })
    }

    async revokeAllForUser(userId: string) {
        return prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        })
    }

    /** Housekeeping: drop rows that can never be used again (DB-016). */
    async purgeStale(olderThan: Date) {
        return prisma.refreshToken.deleteMany({
            where: { OR: [{ expiresAt: { lt: olderThan } }, { revokedAt: { lt: olderThan } }] },
        })
    }
}

export const refreshTokenRepository = new RefreshTokenRepository()
