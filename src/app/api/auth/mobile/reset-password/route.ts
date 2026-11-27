import { NextRequest } from 'next/server'

import { authService } from '@/services/auth.service'
import { resetPasswordSchema } from '@/validations/auth.validation'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { checkRateLimit, getIp } from '@/lib/rateLimit'

// No validateCsrf — this endpoint is secured by the one-time email token.
export const POST = withErrorHandler(async (req: NextRequest) => {
    await checkRateLimit('reset-password', getIp(req.headers))

    const { token, password } = resetPasswordSchema.parse(await req.json())

    // Ends every existing session and refresh token (SEC-004).
    await authService.resetPassword(token, password)

    return ApiResponse.success({ message: 'Password reset successfully. You can now sign in.' })
})
