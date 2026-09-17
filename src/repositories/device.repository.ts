import { prisma } from '@/lib/db/prisma'

export class DeviceRepository {
    async upsert(userId: string, fcmToken: string, data: {
        platform: string
        expoToken?: string
        appVersion?: string
    }) {
        return prisma.device.upsert({
            where: { fcmToken },
            create: { userId, fcmToken, ...data, lastSeenAt: new Date() },
            update: { userId, ...data, lastSeenAt: new Date() },
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
