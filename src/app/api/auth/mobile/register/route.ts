import { NextRequest } from 'next/server'

import { userService } from '@/services/user.service'
import { registerSchema } from '@/validations/auth.validation'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { checkRateLimit, getIp } from '@/lib/rateLimit'
import { authService } from '@/services/auth.service'

export const POST = withErrorHandler(async (req: NextRequest) => {
    await checkRateLimit('register', getIp(req.headers))

    const data = registerSchema.parse(await req.json())

    const user = await userService.create({
        email: data.email,
        name: data.name ?? null,
        password: data.password,
        image: data.image ?? null,
        role: 'USER',
    })

    // Send email verification (re-use existing flow)
    const token = await authService.createEmailToken(user.email)
    // The email link points to the web verify endpoint which handles the token.
    // After verification the user can log in from the mobile app.
    const verifyLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/verify-email?token=${token}&callbackUrl=/`

    const { sendVerificationEmail } = await import('@/utils/mail')
    await sendVerificationEmail(user.email, verifyLink)

    return ApiResponse.created({
        message: 'Account created. Please verify your email before signing in.',
        userId: user.id,
    })
})
