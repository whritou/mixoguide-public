import { NextRequest } from 'next/server'
import { withUser } from '@/middlewares/withAuth'
import { pantryService } from '@/services/pantry.service'
import { ApiResponse } from '@/utils/apiResponse'
import { importDemoBarSchema } from '@/validations/demo-bar.validation'

export const POST = withUser(async (req: NextRequest, _ctx, session) => {
    const { ingredientIds } = importDemoBarSchema.parse(await req.json())
    const result = await pantryService.importDemoBar(session.user.id, ingredientIds)
    return ApiResponse.success(result)
}, { rateLimit: 'bulk-add' })
