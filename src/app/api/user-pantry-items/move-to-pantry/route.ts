import { pantryService } from '@/services/pantry.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withUser } from '@/middlewares/withAuth'
import { z } from 'zod'

export const POST = withUser(async (req, _ctx, session) => {
    const body = await req.json()

    const { ingredientId, amount, unitLeft } = z.object({
        ingredientId: z.string().min(1),
        amount: z.number().min(0),
        unitLeft: z.enum(['cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist']).optional(),
    }).parse(body)

    const item = await pantryService.moveToPantry(
        session.user.id,
        ingredientId,
        amount,
        unitLeft
    )

    return ApiResponse.success(item)
})
