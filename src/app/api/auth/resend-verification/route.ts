import { NextRequest } from "next/server"

import { userService } from "@/services/user.service"
import { authService } from "@/services/auth.service"
import { mailService } from "@/services/mail.service"
import { emailTokenSchema } from "@/validations/auth.validation"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"
import { validateCsrf } from "@/middlewares/csrf"
import { checkRateLimit, rateLimit } from "@/lib/rateLimit"

/**
 * Always 204: unknown, unverified and already-verified addresses are
 * indistinguishable to the caller (SEC-008).
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
    validateCsrf(req)
    await rateLimit("resend-verification", req)

    const { email, callbackUrl } = emailTokenSchema.parse(await req.json())
    await checkRateLimit("signin-account", email)

    const user = await userService.findByEmail(email)
    if (user && !user.emailVerified) {
        const token = await authService.createEmailToken(email, "verify")
        await mailService.sendVerificationEmail(email, token, callbackUrl)
    }

    return ApiResponse.noContent()
})
