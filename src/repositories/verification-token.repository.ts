import { prisma } from '@/lib/db/prisma'

class VerificationTokenRepository {
    async deleteByIdentifier(identifier: string) {
        await prisma.verificationToken.deleteMany({ where: { identifier } })
    }

    async create(identifier: string, token: string, expires: Date) {
        return prisma.verificationToken.create({
            data: { identifier, token, expires },
        })
    }

    async findByToken(token: string) {
        return prisma.verificationToken.findUnique({ where: { token } })
    }

    async deleteByToken(token: string) {
        await prisma.verificationToken.delete({ where: { token } })
    }

    /**
     * Atomically claim a token if it exists and is not yet expired. Two
     * concurrent calls cannot both succeed, which prevents replay of a
     * still-valid reset/verification link.
     */
    async consume(token: string) {
        const record = await prisma.verificationToken.findUnique({ where: { token } })
        if (!record || record.expires < new Date()) return null

        const deleted = await prisma.verificationToken.deleteMany({
            where: { token, expires: { gt: new Date() } },
        })
        if (deleted.count === 0) return null

        return record
    }
}

export const verificationTokenRepository = new VerificationTokenRepository()
