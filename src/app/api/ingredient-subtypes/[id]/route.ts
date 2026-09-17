import { NextRequest } from 'next/server'
import { ingredientSubTypeService } from '@/services/ingredient-subtype.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { withAdmin } from '@/middlewares/withAuth'
import { updateIngredientSubTypeSchema } from '@/validations'


export const GET = withErrorHandler(async (_req: NextRequest, { params }) => {
    const { id } = await params
    const subType = await ingredientSubTypeService.getById(id)

    return ApiResponse.success(subType)
})

export const PUT = withAdmin(async (req, { params }) => {
    const body = await req.json()
    const { id } = await params

    const data = updateIngredientSubTypeSchema.parse(body)
    const subType = await ingredientSubTypeService.update(id, data)

    return ApiResponse.success(subType)
}, { rateLimit: 'admin-write' })

export const DELETE = withAdmin(async (_req, { params }) => {
    const { id } = await params
    await ingredientSubTypeService.delete(id)

    return ApiResponse.noContent()
}, { rateLimit: 'admin-write' })
