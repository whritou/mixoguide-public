import { NextRequest } from 'next/server'

import { mobileAuthService } from '@/services/mobile-auth.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { checkRateLimit, getIp } from '@/lib/rateLimit'

export const POST = withErrorHandler(async (req: NextRequest) => {
    await checkRateLimit('token-refresh', getIp(req.headers))

    const body = await req.json().catch(() => ({})) as { refreshToken?: unknown }

    if (typeof body.refreshToken === 'string' && body.refreshToken.length <= 200) {
        await mobileAuthService.revokeRefreshToken(body.refreshToken)
    }

    return ApiResponse.noContent()
})
