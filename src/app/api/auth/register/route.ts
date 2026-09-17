import { NextRequest } from "next/server"

import { userService } from "@/services/user.service"
import { authService } from "@/services/auth.service"
import { mailService } from "@/services/mail.service"
import { registerSchema, relativeCallbackUrlSchema } from "@/validations/auth.validation"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"
import { verifyTurnstileToken } from "@/utils/turnstile"
import { ValidationError } from "@/utils/errors"
import { checkRateLimit, getIp } from "@/lib/rateLimit"

export const POST = withErrorHandler(async (req: NextRequest) => {
    const ip = getIp(req.headers)
    await checkRateLimit("register", ip)

    const body = await req.json()

    const turnstileToken = body.turnstileToken as string | undefined
    if (!turnstileToken || !(await verifyTurnstileToken(turnstileToken, ip))) {
        throw new ValidationError("Captcha verification failed. Please try again.")
    }

    const data = registerSchema.parse(body)
    const callbackUrl = relativeCallbackUrlSchema.parse(body.callbackUrl ?? "/")

    const user = await userService.create(data)

    const token = await authService.createEmailToken(user.email)
    await mailService.sendVerificationEmail(user.email, token, callbackUrl)

    return ApiResponse.created({
        message: "Account created. Please verify your email.",
    })
})
