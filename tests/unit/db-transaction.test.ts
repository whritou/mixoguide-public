import { describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'

vi.mock('@/lib/db/prisma', () => ({ prisma: { $transaction: vi.fn() } }))

import { withSerializableRetry } from '@/lib/db/transaction'

function prismaError(code: string) {
    return new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: 'test' })
}

function fakeClient(failures: unknown[]) {
    let call = 0
    return {
        $transaction: vi.fn(async (fn: (tx: never) => Promise<unknown>, options: unknown) => {
            void options
            const failure = failures[call++]
            if (failure) throw failure
            return fn({} as never)
        }),
    }
}

describe('withSerializableRetry (DB-005)', () => {
    it('runs the callback in a SERIALIZABLE transaction', async () => {
        const client = fakeClient([])
        await expect(withSerializableRetry(async () => 'ok', { client: client as never })).resolves.toBe('ok')
        expect(client.$transaction).toHaveBeenCalledWith(expect.any(Function), {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        })
    })

    it('retries serialization failures (P2034) and eventually succeeds', async () => {
        const client = fakeClient([prismaError('P2034'), prismaError('P2034')])
        await expect(withSerializableRetry(async () => 'ok', { client: client as never })).resolves.toBe('ok')
        expect(client.$transaction).toHaveBeenCalledTimes(3)
    })

    it('gives up after maxRetries and rethrows the P2034 error', async () => {
        const client = fakeClient([prismaError('P2034'), prismaError('P2034'), prismaError('P2034'), prismaError('P2034')])
        await expect(withSerializableRetry(async () => 'ok', { client: client as never })).rejects.toMatchObject({ code: 'P2034' })
        expect(client.$transaction).toHaveBeenCalledTimes(4)
    })

    it('does not retry other errors unless asked to', async () => {
        const client = fakeClient([prismaError('P2002')])
        await expect(withSerializableRetry(async () => 'ok', { client: client as never })).rejects.toMatchObject({ code: 'P2002' })
        expect(client.$transaction).toHaveBeenCalledTimes(1)

        const retrying = fakeClient([prismaError('P2002')])
        await expect(
            withSerializableRetry(async () => 'ok', { client: retrying as never, retryOnCodes: ['P2002'] }),
        ).resolves.toBe('ok')
        expect(retrying.$transaction).toHaveBeenCalledTimes(2)
    })
})
