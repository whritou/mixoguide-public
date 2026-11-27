import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

/** Prisma client usable both inside and outside an interactive transaction. */
export type DbClient = Prisma.TransactionClient

export function isPrismaErrorCode(err: unknown, code: string): err is Prisma.PrismaClientKnownRequestError {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code
}

/** P2034: "Transaction failed due to a write conflict or a deadlock. Please retry your transaction". */
export function isSerializationFailure(err: unknown): boolean {
    return isPrismaErrorCode(err, 'P2034')
}

/**
 * Run `fn` in a SERIALIZABLE interactive transaction, retrying on serialization
 * failures / deadlocks (P2034) up to `maxRetries` extra attempts with a small
 * jittered backoff. Any other error is rethrown immediately.
 * `fn` may run several times: it must not have side effects outside the transaction.
 */
export async function withSerializableRetry<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options: {
        maxRetries?: number
        /** Extra Prisma error codes to retry, e.g. 'P2002' for racing check-then-insert. */
        retryOnCodes?: string[]
        client?: Pick<typeof prisma, '$transaction'>
    } = {},
): Promise<T> {
    const maxRetries = options.maxRetries ?? 3
    const client = options.client ?? prisma
    const extraCodes = options.retryOnCodes ?? []
    const shouldRetry = (err: unknown) =>
        isSerializationFailure(err) || extraCodes.some((code) => isPrismaErrorCode(err, code))

    for (let attempt = 0; ; attempt++) {
        try {
            return await client.$transaction(fn, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            })
        } catch (err) {
            if (!shouldRetry(err) || attempt >= maxRetries) throw err
            const delayMs = 10 * 2 ** attempt + Math.floor(Math.random() * 10)
            await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
    }
}
