import { NextRequest } from 'next/server'

import { userService } from '@/services/user.service'
import { authService } from '@/services/auth.service'
import { emailSchema } from '@/validations/auth.validation'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { checkRateLimit, getIp } from '@/lib/rateLimit'
import { sendResetPasswordEmail } from '@/utils/mail'
import { env } from '@/lib/env'
import { z } from 'zod'

const schema = z.object({ email: emailSchema })

export const POST = withErrorHandler(async (req: NextRequest) => {
    await checkRateLimit('reset-password', getIp(req.headers))

    const { email } = schema.parse(await req.json())
    const user = await userService.getByEmail(email).catch(() => null)

    if (user) {
        const token = await authService.createEmailToken(email)
        // Deep link — opens the mobile app directly
        const link = `${env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}&source=mobile`
        await sendResetPasswordEmail(email, link)
    }

    // Always 204 — don't leak whether the email exists
    return ApiResponse.noContent()
})
