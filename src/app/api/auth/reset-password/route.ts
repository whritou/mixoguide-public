import { NextRequest } from "next/server"

import { authService } from "@/services/auth.service"
import { resetPasswordSchema } from "@/validations/auth.validation"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"
import { validateCsrf } from "@/middlewares/csrf"
import { checkRateLimit, getIp } from "@/lib/rateLimit"

export const POST = withErrorHandler(async (req: NextRequest) => {
    validateCsrf(req)
    await checkRateLimit("reset-password", getIp(req.headers))

    const { token, password } = resetPasswordSchema.parse(await req.json())

    // Ends every existing session and refresh token, then signs this browser in.
    const user = await authService.resetPassword(token, password)

    const { token: sessionToken, cookieName, cookieOptions } = await authService.createSession(user)

    const res = ApiResponse.success({ success: true })
    res.cookies.set(cookieName, sessionToken, cookieOptions)

    return res
})
