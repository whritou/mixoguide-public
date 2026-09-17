import { NextRequest } from 'next/server'
import { cocktailService } from '@/services/cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { withAdmin } from '@/middlewares/withAuth'
import { syncCocktailIngredientsSchema } from '@/validations'

export const GET = withErrorHandler(async (_req: NextRequest, { params }) => {
    const { id } = await params
    const cocktail = await cocktailService.getById(id)

    return ApiResponse.success(cocktail.ingredients)
})

export const PUT = withAdmin(async (req, { params }) => {
    const body = await req.json()
    const { id } = await params
    const { ingredients } = syncCocktailIngredientsSchema.parse(body)

    await cocktailService.syncIngredients(id, ingredients)
    const updated = await cocktailService.getById(id)

    return ApiResponse.success(updated.ingredients)
})