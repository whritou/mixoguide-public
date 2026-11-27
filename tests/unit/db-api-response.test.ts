import { describe, expect, it } from 'vitest'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { ApiResponse } from '@/utils/apiResponse'
import { ConflictError } from '@/utils/errors'

function prismaError(code: string) {
    return new Prisma.PrismaClientKnownRequestError(`prisma ${code}`, { code, clientVersion: 'test' })
}

async function body(res: Response) {
    return res.json() as Promise<{ success: boolean; error: { message: string; code: string } }>
}

describe('ApiResponse.fromError — Prisma error mapping (DB-005)', () => {
    it.each([
        ['P2002', 409, 'CONFLICT'],
        ['P2003', 409, 'CONSTRAINT_VIOLATION'],
        ['P2025', 404, 'NOT_FOUND'],
        ['P2034', 409, 'CONFLICT'],
    ])('maps %s to HTTP %i (%s)', async (code, status, errorCode) => {
        const res = ApiResponse.fromError(prismaError(code))
        expect(res.status).toBe(status)
        const json = await body(res)
        expect(json.success).toBe(false)
        expect(json.error.code).toBe(errorCode)
        // Never leak the raw Prisma message (it contains table / constraint names).
        expect(json.error.message).not.toContain('prisma')
    })

    it('keeps unknown Prisma errors as 500', async () => {
        const res = ApiResponse.fromError(prismaError('P2010'))
        expect(res.status).toBe(500)
        expect((await body(res)).error.code).toBe('INTERNAL_ERROR')
    })

    it('still maps AppError and ZodError as before', async () => {
        expect(ApiResponse.fromError(new ConflictError('dup')).status).toBe(409)
        expect(ApiResponse.fromError(new ZodError([])).status).toBe(422)
        expect(ApiResponse.fromError(new Error('boom')).status).toBe(500)
    })
})
