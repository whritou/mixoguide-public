// src/middlewares/withAuth.ts
// Reusable authentication middleware wrappers for API routes.
// Combines error handling + session validation in a single composable layer.

import { NextRequest } from 'next/server'
import { requireAdmin, requireUser } from '@/lib/auth/requireAdmin'
import { withErrorHandler } from './withErrorHandler'
import { validateCsrf } from './csrf'
import { ForbiddenError, UnauthorizedError } from '@/utils/errors'
import { rateLimit, type RateLimitAction } from '@/lib/rateLimit'

type RouteContext = { params: Promise<Record<string, string>> }

type Session = NonNullable<Awaited<ReturnType<typeof requireUser>>>
type RouteOptions = { rateLimit?: RateLimitAction }
type PublicHandler = (req: NextRequest, context: RouteContext) => Promise<Response>

type AuthenticatedHandler = (
    req: NextRequest,
    context: RouteContext,
    session: Session,
) => Promise<Response>

/**
 * Wraps a route handler with admin-level authentication.
 * Automatically handles errors and returns 403 if not admin.
 * The session is guaranteed to be valid and injected into the handler.
 */
export function withAdmin(handler: AuthenticatedHandler, options: RouteOptions = {}) {
    return withErrorHandler(async (req: NextRequest, context: RouteContext) => {
        validateCsrf(req)
        const session = await requireAdmin()
        if (!session?.user?.id) throw new ForbiddenError('Admin access required')
        if (options.rateLimit) await rateLimit(options.rateLimit, req, session)
        return handler(req, context, session)
    })
}

/**
 * Wraps a route handler with user-level authentication.
 * Automatically handles errors and returns 401 if not authenticated.
 * The session is guaranteed to be valid and injected into the handler.
 */
export function withUser(handler: AuthenticatedHandler, options: RouteOptions = {}) {
    return withErrorHandler(async (req: NextRequest, context: RouteContext) => {
        validateCsrf(req)
        const session = await requireUser()
        if (!session?.user?.id) throw new UnauthorizedError('Login required')
        if (options.rateLimit) await rateLimit(options.rateLimit, req, session)
        return handler(req, context, session)
    })
}

/** Rate limit applied to unauthenticated routes unless the route opts into another one (SEC-012). */
const DEFAULT_PUBLIC_RATE_LIMIT: RateLimitAction = 'public-read'

/**
 * Wraps a public route handler with shared error handling and IP-based rate
 * limiting (`public-read` by default). Unsafe methods are CSRF-checked.
 */
export function withPublic(handler: PublicHandler, options: RouteOptions = {}) {
    return withErrorHandler(async (req: NextRequest, context: RouteContext) => {
        validateCsrf(req)
        await rateLimit(options.rateLimit ?? DEFAULT_PUBLIC_RATE_LIMIT, req)
        return handler(req, context)
    })
}

type OptionalAuthHandler = (
    req: NextRequest,
    context: RouteContext,
    session: Session | null,
) => Promise<Response>

/**
 * Wraps a route handler that works for both authenticated and unauthenticated users.
 * Session is null when the user is not logged in.
 */
export function withOptionalUser(handler: OptionalAuthHandler, options: RouteOptions = {}) {
    return withErrorHandler(async (req: NextRequest, context: RouteContext) => {
        validateCsrf(req)
        await rateLimit(options.rateLimit ?? DEFAULT_PUBLIC_RATE_LIMIT, req)
        const session = await requireUser()
        return handler(req, context, session ?? null)
    })
}
