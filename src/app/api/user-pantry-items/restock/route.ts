import { NextRequest } from 'next/server'
import { withUser } from '@/middlewares/withAuth'
import { pantryService } from '@/services/pantry.service'
import { ApiResponse } from '@/utils/apiResponse'
import { restockPantryItemsSchema } from '@/validations'

export const POST = withUser(async (req: NextRequest, _ctx, session) => {
    const { items } = restockPantryItemsSchema.parse(await req.json())

    const result = await pantryService.addItemsBulk(
        session.user.id,
        items.map((item) => ({
            ...item,
            destination: 'pantry' as const,
            shoppingQuantity: 0,
        })),
    )

    return ApiResponse.success(result)
}, { rateLimit: 'bulk-add' })
