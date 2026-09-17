import { NextRequest } from "next/server"

import { userService } from "@/services/user.service"
import { authService } from "@/services/auth.service"
import { loginSchema } from "@/validations/auth.validation"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"
import { validateCsrf } from "@/middlewares/csrf"
import { checkRateLimit, getIp } from "@/lib/rateLimit"
import { UnauthorizedError, ForbiddenError } from "@/utils/errors"

export const POST = withErrorHandler(async (req: NextRequest) => {
    validateCsrf(req)
    await checkRateLimit("signin", getIp(req.headers))

    const { email, password } = loginSchema.parse(await req.json())

    const user = await userService.verifyPassword(email, password)
    if (!user) throw new UnauthorizedError("Invalid credentials")
    if (!user.emailVerified) throw new ForbiddenError("Email not verified")

    const { token, cookieOptions } = await authService.createSession(user)

    const res = ApiResponse.success({ success: true })
    res.cookies.set("next-auth.session-token", token, cookieOptions)

    return res
})
