import { userService } from '@/services/user.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withAdmin } from '@/middlewares/withAuth'
import { parseQueryParams } from '@/utils/parseQueryParams'

export const GET = withAdmin(async (req) => {
    const params = parseQueryParams(req.nextUrl.searchParams)
    const result = await userService.getAll(params)
    return ApiResponse.paginated(result)
})
