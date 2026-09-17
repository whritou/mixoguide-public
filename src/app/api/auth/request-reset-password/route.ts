import { NextRequest } from "next/server"

import { userService } from "@/services/user.service"
import { authService } from "@/services/auth.service"
import { mailService } from "@/services/mail.service"
import { emailTokenSchema } from "@/validations/auth.validation"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"
import { checkRateLimit, getIp } from "@/lib/rateLimit"

export const POST = withErrorHandler(async (req: NextRequest) => {
    await checkRateLimit("reset-password", getIp(req.headers))

    const { email } = emailTokenSchema.parse(await req.json())

    const user = await userService.getByEmail(email).catch(() => null)

    if (user) {
        const token = await authService.createEmailToken(email)
        await mailService.sendResetPasswordEmail(email, token)
    }

    return ApiResponse.noContent()
})
