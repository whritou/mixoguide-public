import { NextResponse } from 'next/server'
import { checkReadiness } from '@/lib/health'

export const dynamic = 'force-dynamic'

/** Readiness probe: DB `SELECT 1` and Redis `PING` (when configured), 2 s timeout each. */
export const GET = async () => {
    const report = await checkReadiness()
    return NextResponse.json(report, {
        status: report.status === 'ok' ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
    })
}
