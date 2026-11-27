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
     * Atomically claim a token if it exists, is not expired and belongs to the
     * expected purpose (identifier prefix). Two concurrent calls cannot both
     * succeed, and a token of another purpose is never consumed.
     */
    async consume(token: string, identifierPrefix: string) {
        const record = await prisma.verificationToken.findUnique({ where: { token } })
        if (!record || record.expires < new Date()) return null
        if (!record.identifier.startsWith(identifierPrefix)) return null

        const deleted = await prisma.verificationToken.deleteMany({
            where: { token, identifier: record.identifier, expires: { gt: new Date() } },
        })
        if (deleted.count === 0) return null

        return record
    }

    /** Housekeeping: remove expired tokens (DB-016). */
    async purgeExpired(before: Date = new Date()) {
        return prisma.verificationToken.deleteMany({ where: { expires: { lt: before } } })
    }
}

export const verificationTokenRepository = new VerificationTokenRepository()
