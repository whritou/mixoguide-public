import { NextRequest } from 'next/server'
import { barToolService } from '@/services/bartool.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { withAdmin } from '@/middlewares/withAuth'
import { updateBarToolSchema } from '@/validations'


export const GET = withErrorHandler(async (_req: NextRequest, { params }) => {
    const { id } = await params
    const barTool = await barToolService.getById(id)
    return ApiResponse.success(barTool)
})

export const PUT = withAdmin(async (req, { params }) => {
    const { id } = await params
    const body = await req.json()

    const data = updateBarToolSchema.parse(body)
    const barTool = await barToolService.update(id, data)
    return ApiResponse.success(barTool)
})

export const DELETE = withAdmin(async (_req, { params }) => {
    const { id } = await params
    await barToolService.delete(id)
    return ApiResponse.noContent()
})
