import { plannedCocktailService } from '@/services/planned-cocktail.service'
import { ApiResponse } from '@/utils/apiResponse'
import { makeCocktailNowSchema } from '@/validations'
import { withUser } from '@/middlewares/withAuth'

export const POST = withUser(async (req, { params }, session) => {
    const { id } = await params
    const body   = await req.json()
    const { quantity } = makeCocktailNowSchema.parse(body)

    const result = await plannedCocktailService.makeNow(session.user.id, id, quantity)
    return ApiResponse.created(result)
}, { rateLimit: 'bulk-add' })
