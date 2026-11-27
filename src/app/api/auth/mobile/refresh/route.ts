import { NextRequest } from 'next/server'

import { mobileAuthService } from '@/services/mobile-auth.service'
import { userRepository } from '@/repositories/user.repository'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { UnauthorizedError } from '@/utils/errors'
import { checkRateLimit, getIp } from '@/lib/rateLimit'

export const POST = withErrorHandler(async (req: NextRequest) => {
    await checkRateLimit('token-refresh', getIp(req.headers))

    const body = await req.json().catch(() => ({})) as { refreshToken?: unknown }
    const refreshToken = body.refreshToken
    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.length > 200) {
        throw new UnauthorizedError('Missing refresh token')
    }

    const deviceId = (req.headers.get('x-device-id') ?? 'unknown').slice(0, 200)

    // Rotation: the presented token is consumed; reuse revokes the family (SEC-004).
    let rotated: { refreshToken: string; userId: string }
    try {
        rotated = await mobileAuthService.rotateRefreshToken(refreshToken, deviceId)
    } catch (err) {
        if (err instanceof Error && err.message === 'INVALID_REFRESH_TOKEN') {
            throw new UnauthorizedError('Invalid or expired refresh token')
        }
        throw err
    }

    const user = await userRepository.findById(rotated.userId)
    if (!user) throw new UnauthorizedError('User not found')

    const accessToken = await mobileAuthService.createAccessToken(user)

    return ApiResponse.success({
        accessToken,
        refreshToken: rotated.refreshToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
        },
    })
})
