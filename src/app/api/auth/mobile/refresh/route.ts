import { NextRequest } from 'next/server'

import { mobileAuthService } from '@/services/mobile-auth.service'
import { userRepository } from '@/repositories/user.repository'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { UnauthorizedError } from '@/utils/errors'

export const POST = withErrorHandler(async (req: NextRequest) => {
    const { refreshToken } = await req.json()
    if (!refreshToken || typeof refreshToken !== 'string') {
        throw new UnauthorizedError('Missing refresh token')
    }

    const deviceId = req.headers.get('x-device-id') ?? 'unknown'

    let renewed: { refreshToken: string; userId: string }
    try {
        renewed = await mobileAuthService.renewRefreshToken(refreshToken, deviceId)
    } catch (err) {
        if (err instanceof Error && err.message === 'INVALID_REFRESH_TOKEN') {
            throw new UnauthorizedError('Invalid or expired refresh token')
        }
        throw err
    }

    const user = await userRepository.findById(renewed.userId)
    if (!user) throw new UnauthorizedError('User not found')

    const newAccessToken = await mobileAuthService.createAccessToken(user)

    return ApiResponse.success({
        accessToken: newAccessToken,
        refreshToken: renewed.refreshToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
        },
    })
})
