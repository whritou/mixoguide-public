/**
 * Purge expired / revoked auth tokens (DB-016).
 *
 * Deletes:
 *  - verification_tokens whose `expires` is more than RETENTION_DAYS in the past,
 *  - refresh_tokens expired OR revoked more than RETENTION_DAYS ago,
 *  - mobile_oauth_exchange_codes expired more than RETENTION_DAYS ago.
 *
 * Deletes in batches so a large backlog never holds long locks.
 * Run on a schedule (e.g. daily cron / Coolify scheduled task):
 *   tsx prisma/seeder/purge-expired-tokens.ts            (dev)
 *   node dist/prisma/seeder/purge-expired-tokens.js      (prod build)
 * Options: --dry-run, --days=<n> (default 7)
 */
import { PrismaClient } from '@prisma/client'

const BATCH_SIZE = 5_000

function parseArgs(argv: string[]) {
    const dryRun = argv.includes('--dry-run')
    const daysArg = argv.find((a) => a.startsWith('--days='))
    const days = daysArg ? Number(daysArg.slice('--days='.length)) : 7
    if (!Number.isInteger(days) || days < 0) throw new Error(`Invalid --days value: ${daysArg}`)
    return { dryRun, days }
}

async function deleteInBatches(run: () => Promise<number>): Promise<number> {
    let total = 0
    for (;;) {
        const deleted = await run()
        total += deleted
        if (deleted < BATCH_SIZE) return total
    }
}

async function purgeExpiredTokens(prisma: PrismaClient, options: { days: number; dryRun: boolean }) {
    const cutoff = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000)

    if (options.dryRun) {
        const [verification, refresh, oauthCodes] = await Promise.all([
            prisma.verificationToken.count({ where: { expires: { lt: cutoff } } }),
            prisma.refreshToken.count({
                where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
            }),
            prisma.mobileOAuthExchangeCode.count({ where: { expiresAt: { lt: cutoff } } }),
        ])
        return { verification, refresh, oauthCodes, cutoff }
    }

    const verification = await deleteInBatches(() => prisma.$executeRaw`
        DELETE FROM verification_tokens
         WHERE token IN (
               SELECT token FROM verification_tokens
                WHERE expires < ${cutoff}
                LIMIT ${BATCH_SIZE})
    `)
    const refresh = await deleteInBatches(() => prisma.$executeRaw`
        DELETE FROM refresh_tokens
         WHERE id IN (
               SELECT id FROM refresh_tokens
                WHERE expires_at < ${cutoff} OR revoked_at < ${cutoff}
                LIMIT ${BATCH_SIZE})
    `)
    const oauthCodes = await deleteInBatches(() => prisma.$executeRaw`
        DELETE FROM mobile_oauth_exchange_codes
         WHERE id IN (
               SELECT id FROM mobile_oauth_exchange_codes
                WHERE expires_at < ${cutoff}
                LIMIT ${BATCH_SIZE})
    `)
    return { verification, refresh, oauthCodes, cutoff }
}

async function main() {
    const options = parseArgs(process.argv.slice(2))
    const prisma = new PrismaClient()
    try {
        const result = await purgeExpiredTokens(prisma, options)
        const verb = options.dryRun ? 'would delete' : 'deleted'
        console.log(
            `[purge-expired-tokens] cutoff=${result.cutoff.toISOString()} ${verb}: ` +
            `verification_tokens=${result.verification} refresh_tokens=${result.refresh} ` +
            `mobile_oauth_exchange_codes=${result.oauthCodes}`,
        )
    } finally {
        await prisma.$disconnect()
    }
}

main().catch((err) => {
    console.error('[purge-expired-tokens] failed:', err)
    process.exitCode = 1
})
