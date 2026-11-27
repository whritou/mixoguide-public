import { NextRequest } from "next/server"

import { userService } from "@/services/user.service"
import { pantryService } from "@/services/pantry.service"
import { authService } from "@/services/auth.service"
import { mailService } from "@/services/mail.service"
import { publicRegisterSchema, relativeCallbackUrlSchema } from "@/validations/auth.validation"
import { demoBarSchema } from "@/validations/demo-bar.validation"
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

    const data = publicRegisterSchema.parse(body)
    const callbackUrl = relativeCallbackUrlSchema.parse(body.callbackUrl ?? "/")
    const demoBar = demoBarSchema.optional().safeParse(body.demoBar)

    const user = await userService.create({
        email: data.email,
        name: data.name,
        password: data.password,
        role: "USER",
    })

    if (demoBar.success && demoBar.data?.length) {
        try {
            await pantryService.importDemoBar(user.id, demoBar.data)
        } catch (error) {
            console.error('[Register] demo bar import failed', error)
        }
    }

    const token = await authService.createEmailToken(user.email)
    await mailService.sendVerificationEmail(user.email, token, callbackUrl)

    return ApiResponse.created({
        message: "Account created. Please verify your email.",
    })
})
