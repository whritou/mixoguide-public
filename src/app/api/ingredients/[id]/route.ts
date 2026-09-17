import { NextRequest } from 'next/server'
import { ingredientService } from '@/services/ingredient.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { withAdmin } from '@/middlewares/withAuth'
import { updateIngredientSchema } from '@/validations'


export const GET = withErrorHandler(async (_req: NextRequest, { params }) => {
    const { id } = await params
    const ingredient = await ingredientService.getById(id)
    return ApiResponse.success(ingredient)
})

export const PUT = withAdmin(async (req, { params }) => {
    const { id } = await params
    const body = await req.json()
    const data = updateIngredientSchema.parse(body)
    const ingredient = await ingredientService.update(id, data)
    return ApiResponse.success(ingredient)
})

export const DELETE = withAdmin(async (_req, { params }) => {
    const { id } = await params
    await ingredientService.delete(id)
    return ApiResponse.noContent()
})