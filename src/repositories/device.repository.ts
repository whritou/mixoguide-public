import { prisma } from '@/lib/db/prisma'

export class DeviceRepository {
    async upsert(userId: string, fcmToken: string, data: {
        platform: string
        expoToken?: string
        appVersion?: string
    }) {
        // A push token identifies one app install. If another account already
        // owns it (the install signed in as someone else), the previous binding is
        // removed and recreated for the caller in one transaction; the token is only
        // obtainable on the device itself, so this mirrors a re-login rather than a
        // takeover. Ownership of an existing row is never mutated in place (SEC-013).
        return prisma.$transaction(async (tx) => {
            const existing = await tx.device.findUnique({ where: { fcmToken }, select: { userId: true } })
            if (existing && existing.userId !== userId) {
                await tx.device.delete({ where: { fcmToken } })
            }
            return tx.device.upsert({
                where: { fcmToken },
                create: { userId, fcmToken, ...data, lastSeenAt: new Date() },
                update: { ...data, lastSeenAt: new Date() },
            })
        })
    }

    async deleteByToken(userId: string, fcmToken: string) {
        return prisma.device.deleteMany({ where: { userId, fcmToken } })
    }

    async findAllForUser(userId: string) {
        return prisma.device.findMany({ where: { userId } })
    }
}

export const deviceRepository = new DeviceRepository()
