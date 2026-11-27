import { NextRequest, NextResponse } from "next/server"

import { authService } from "@/services/auth.service"
import { env } from "@/lib/env"
import { verifyEmailQuerySchema } from "@/validations/auth.validation"
import { withErrorHandler } from "@/middlewares/withErrorHandler"
import { validateCsrf } from "@/middlewares/csrf"
import { checkRateLimit, getIp } from "@/lib/rateLimit"
import { ApiResponse } from "@/utils/apiResponse"

/**
 * GET is side-effect free (SEC-009): email link scanners and prefetchers follow
 * links, so consuming the token here would burn it (and hand the scanner a
 * session). It forwards to a confirmation page that POSTs the token.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
    const { searchParams } = new URL(req.url)
    const { token, callbackUrl } = verifyEmailQuerySchema.parse({
        token: searchParams.get("token"),
        callbackUrl: searchParams.get("callbackUrl") ?? "/",
    })

    const target = new URL("/verify-email", env.NEXTAUTH_URL)
    target.searchParams.set("token", token)
    target.searchParams.set("callbackUrl", callbackUrl)
    return NextResponse.redirect(target)
})

/** Consume the verification token, mark the email verified and sign the browser in. */
export const POST = withErrorHandler(async (req: NextRequest) => {
    validateCsrf(req)
    await checkRateLimit("resend-verification", getIp(req.headers))

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const { token: rawToken, callbackUrl } = verifyEmailQuerySchema.parse({
        token: body.token,
        callbackUrl: body.callbackUrl ?? "/",
    })

    const user = await authService.consumeEmailToken(rawToken, "verify")
    await authService.markEmailVerified(user.id)

    const { token, cookieName, cookieOptions } = await authService.createSession(user)

    const res = ApiResponse.success({ redirectTo: callbackUrl })
    res.cookies.set(cookieName, token, cookieOptions)
    return res
})
