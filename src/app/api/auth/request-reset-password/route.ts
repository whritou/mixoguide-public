import { NextRequest } from "next/server"
import { z } from "zod"

import { userService } from "@/services/user.service"
import { authService } from "@/services/auth.service"
import { mailService } from "@/services/mail.service"
import { emailSchema } from "@/validations/auth.validation"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"
import { validateCsrf } from "@/middlewares/csrf"
import { checkRateLimit, getIp } from "@/lib/rateLimit"

const schema = z.object({ email: emailSchema })

/** Always 204: never reveals whether the address is registered (SEC-008). */
export const POST = withErrorHandler(async (req: NextRequest) => {
    validateCsrf(req)
    await checkRateLimit("reset-password", getIp(req.headers))

    const { email } = schema.parse(await req.json())
    await checkRateLimit("signin-account", email)

    const user = await userService.findByEmail(email)
    if (user) {
        const token = await authService.createEmailToken(email, "reset")
        await mailService.sendResetPasswordEmail(email, token)
    }

    return ApiResponse.noContent()
})
