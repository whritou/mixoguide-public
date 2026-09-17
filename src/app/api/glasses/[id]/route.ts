import { NextRequest } from 'next/server'
import { glassService } from '@/services/glass.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { withAdmin } from '@/middlewares/withAuth'
import { updateGlassSchema } from '@/validations'

export const GET = withErrorHandler(async (_req: NextRequest, { params }) => {
    const { id } = await params
    const glass = await glassService.getById(id)

    return ApiResponse.success(glass)
})

export const PUT = withAdmin(async (req, { params }) => {
    const body = await req.json()
    const { id } = await params

    const data = updateGlassSchema.parse(body)
    const glass = await glassService.update(id, data)

    return ApiResponse.success(glass)
})

export const DELETE = withAdmin(async (_req, { params }) => {
    const { id } = await params
    await glassService.delete(id)

    return ApiResponse.noContent()
})