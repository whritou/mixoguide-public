import { NextRequest } from 'next/server'
import { withUser } from '@/middlewares/withAuth'
import { cocktailService } from '@/services/cocktail.service'
import { pantryService } from '@/services/pantry.service'
import { ApiResponse } from '@/utils/apiResponse'
import { addIngredientsBulkSchema } from '@/validations'

export const POST = withUser(async (req: NextRequest, { params }, session) => {
    const { id } = await params
    await cocktailService.getById(id)

    const { items } = addIngredientsBulkSchema.parse(await req.json())

    const result = await pantryService.addItemsBulk(session.user.id, items)
    return ApiResponse.success(result)
}, { rateLimit: 'bulk-add' })
