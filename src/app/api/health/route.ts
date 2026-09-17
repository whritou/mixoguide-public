import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export const GET = async () => {
    try {
        await prisma.$queryRaw`SELECT 1`
        return NextResponse.json({ status: 'ok', db: 'ok' }, { status: 200 })
    } catch {
        return NextResponse.json({ status: 'error', db: 'unreachable' }, { status: 503 })
    }
}
