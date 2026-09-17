import { NextRequest } from 'next/server'
import { cocktailService } from '@/services/cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { withAdmin } from '@/middlewares/withAuth'
import { updateCocktailSchema } from '@/validations'

export const GET = withErrorHandler(async (_req: NextRequest, { params }) => {
    const { id } = await params
    const cocktail = await cocktailService.getById(id)

    return ApiResponse.success(cocktail)
})

export const PUT = withAdmin(async (req, { params }) => {
    const { id } = await params
    const body = await req.json()

    const data = updateCocktailSchema.parse(body)
    const cocktail = await cocktailService.update(id, data)

    return ApiResponse.success(cocktail)
})

export const DELETE = withAdmin(async (_req, { params }) => {
    const { id } = await params
    await cocktailService.delete(id)
    return ApiResponse.noContent()
})
