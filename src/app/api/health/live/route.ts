import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Liveness probe: the process is up and serving requests. No dependency checks. */
export const GET = async () =>
    NextResponse.json({ status: 'ok' }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
