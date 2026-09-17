import { smartCollectionService } from '@/services/smart-collection.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withOptionalUser } from '@/middlewares/withAuth'

export const GET = withOptionalUser(async (_req, { params }, session) => {
    const { slug } = await params
    const item = await smartCollectionService.getBySlug(slug, undefined, session?.user?.id)
    return ApiResponse.success(item)
})
