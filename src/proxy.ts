import { NextRequest, NextResponse } from 'next/server'

/**
 * Forwards the request pathname as `x-pathname` so server guards
 * (`src/lib/auth/guards.ts`) can build a `callbackUrl` when redirecting to
 * /signin. Kept (PERF-009) because it is also the natural place for a per-request
 * CSP nonce (SEC-015). The matcher limits it to page navigations: API routes,
 * Next static/image assets and public files with an extension never run it.
 */
export function proxy(req: NextRequest) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-pathname', req.nextUrl.pathname)

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|txt|xml|json|webmanifest|woff2?|ttf|otf)$).*)',
    ],
}
