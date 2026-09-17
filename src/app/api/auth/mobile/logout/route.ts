import { NextRequest } from 'next/server'

import { mobileAuthService } from '@/services/mobile-auth.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'

export const POST = withErrorHandler(async (req: NextRequest) => {
    const { refreshToken } = await req.json()

    if (refreshToken && typeof refreshToken === 'string') {
        await mobileAuthService.revokeRefreshToken(refreshToken)
    }

    return ApiResponse.noContent()
})
