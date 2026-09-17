import { NextRequest } from 'next/server'

import { deviceRepository } from '@/repositories/device.repository'
import { registerDeviceSchema } from '@/validations'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'

export const POST = withUser(async (req: NextRequest, _ctx, session) => {
    const data = registerDeviceSchema.parse(await req.json())

    const device = await deviceRepository.upsert(session.user.id, data.fcmToken, {
        platform: data.platform,
        expoToken: data.expoToken,
        appVersion: data.appVersion,
    })

    return ApiResponse.success(device)
})

export const DELETE = withUser(async (req: NextRequest, _ctx, session) => {
    const { fcmToken } = await req.json()

    if (!fcmToken || typeof fcmToken !== 'string') {
        return ApiResponse.error('Missing fcmToken', 400, 'BAD_REQUEST')
    }

    await deviceRepository.deleteByToken(session.user.id, fcmToken)

    return ApiResponse.noContent()
})
