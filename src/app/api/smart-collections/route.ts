import { smartCollectionService } from '@/services/smart-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withOptionalUser } from '@/middlewares/withAuth'

export const GET = withOptionalUser(async (_req, _ctx, session) => {
    const items = await smartCollectionService.listAll(session?.user?.id)
    return ApiResponse.success(items)
})
