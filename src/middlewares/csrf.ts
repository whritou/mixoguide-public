import { NextRequest } from 'next/server'
import { ForbiddenError } from '@/utils/errors'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Validate that mutation requests originate from the same site.
 * Checks the Origin header (preferred) or Referer header against the request host.
 * Safe methods (GET, HEAD, OPTIONS) are always allowed.
 */
export function validateCsrf(req: NextRequest): void {
    if (SAFE_METHODS.has(req.method)) return

    // Mobile clients authenticate via Bearer token — CSRF does not apply.
    if (req.headers.get('authorization')?.startsWith('Bearer ')) return

    const origin  = req.headers.get('origin')
    const referer = req.headers.get('referer')
    const host    = req.headers.get('host')

    if (!host) return // Can't validate without host

    const source = origin ?? (referer ? new URL(referer).origin : null)

    if (!source) {
        throw new ForbiddenError('Missing origin header')
    }

    const sourceHost = new URL(source).host
    if (sourceHost !== host) {
        throw new ForbiddenError('Cross-origin request blocked')
    }
}
