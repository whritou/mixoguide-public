import { plannedCocktailService } from '@/services/planned-cocktail.service'
import { pantryService } from '@/services/pantry.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { NextRequest } from 'next/server'
import { addIngredientsBulkSchema } from '@/validations'

export const POST = withUser(async (req: NextRequest, { params }, session) => {
    const { id } = await params
    const item = await plannedCocktailService.getById(id)
    plannedCocktailService.assertOwnership(item, session.user.id, session.user.role === 'ADMIN')

    const { items } = addIngredientsBulkSchema.parse(await req.json())

    const result = await pantryService.addItemsBulk(session.user.id, items)
    return ApiResponse.success(result)
}, { rateLimit: 'bulk-add' })
