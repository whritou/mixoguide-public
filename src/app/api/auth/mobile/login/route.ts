import { NextRequest } from 'next/server'

import { userService } from '@/services/user.service'
import { mobileAuthService } from '@/services/mobile-auth.service'
import { loginSchema } from '@/validations/auth.validation'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { UnauthorizedError, ForbiddenError } from '@/utils/errors'
import { enforceCredentialPolicy } from '@/lib/auth/credentialPolicy'

export const POST = withErrorHandler(async (req: NextRequest) => {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const { email, password } = loginSchema.parse(body)

    await enforceCredentialPolicy(req, {
        channel: 'mobile',
        action: 'signin',
        email,
        turnstileToken: body.turnstileToken,
        turnstileAction: 'signin',
    })

    const deviceId = (req.headers.get('x-device-id') ?? 'unknown').slice(0, 200)

    const user = await userService.verifyPassword(email, password)
    if (!user) throw new UnauthorizedError('Invalid credentials')
    if (!user.emailVerified) throw new ForbiddenError('Email not verified')

    const [accessToken, refreshToken] = await Promise.all([
        mobileAuthService.createAccessToken(user),
        mobileAuthService.createRefreshToken(user.id, deviceId),
    ])

    return ApiResponse.success({
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
        },
    })
})
