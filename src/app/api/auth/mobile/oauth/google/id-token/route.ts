import { NextRequest } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/db/prisma'
import { checkRateLimit, getIp } from '@/lib/rateLimit'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { mobileAuthService } from '@/services/mobile-auth.service'
import { ApiResponse } from '@/utils/apiResponse'
import { UnauthorizedError } from '@/utils/errors'
import {
    getOrCreateGoogleUserFromVerifiedProfile,
    verifyGoogleIdToken,
} from '../utils'

const idTokenSchema = z.object({
    idToken: z.string().min(1).max(20_000),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
    await checkRateLimit('signin', getIp(req.headers))

    const deviceId = req.headers.get('x-device-id')
    if (!deviceId) throw new UnauthorizedError('Missing device id')

    const { idToken } = idTokenSchema.parse(await req.json())
    const profile = await verifyGoogleIdToken(idToken)
    const linkedUser = await getOrCreateGoogleUserFromVerifiedProfile(profile)

    const user = await prisma.user.findUnique({ where: { id: linkedUser.id } })
    if (!user) throw new UnauthorizedError('Invalid Google account')

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
