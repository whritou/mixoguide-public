import { NextRequest } from 'next/server'
import { ingredientTypeService } from '@/services/ingredient-type.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { withAdmin } from '@/middlewares/withAuth'
import { updateIngredientTypeSchema } from '@/validations'


export const GET = withErrorHandler(async (_req: NextRequest, { params }) => {
    const { id } = await params
    const type = await ingredientTypeService.getById(id)

    return ApiResponse.success(type)
})

export const PUT = withAdmin(async (req, { params }) => {
    const body = await req.json()
    const { id } = await params

    const data = updateIngredientTypeSchema.parse(body)
    const type = await ingredientTypeService.update(id, data)

    return ApiResponse.success(type)
})

export const DELETE = withAdmin(async (_req, { params }) => {
    const { id } = await params
    await ingredientTypeService.delete(id)

    return ApiResponse.noContent()
})