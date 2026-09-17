import { adminStatsService } from '@/services/admin-stats.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withAdmin } from '@/middlewares/withAuth'

export const GET = withAdmin(async () => {
    const stats = await adminStatsService.getDashboardStats()
    return ApiResponse.success(stats)
})
