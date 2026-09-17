import { NextRequest } from "next/server"

import { userService } from "@/services/user.service"
import { authService } from "@/services/auth.service"
import { mailService } from "@/services/mail.service"
import { emailTokenSchema } from "@/validations/auth.validation"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"
import { BadRequestError } from "@/utils/errors"
import { rateLimit } from "@/lib/rateLimit"

export const POST = withErrorHandler(async (req: NextRequest) => {
    await rateLimit("resend-verification", req)

    const { email, callbackUrl } = emailTokenSchema.parse(await req.json())

    const user = await userService.getByEmail(email)
    if (user.emailVerified) throw new BadRequestError("Email already verified")

    const token = await authService.createEmailToken(email)
    await mailService.sendVerificationEmail(email, token, callbackUrl)

    return ApiResponse.noContent()
})
