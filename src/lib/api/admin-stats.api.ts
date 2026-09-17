import type { AdminDashboardStats } from '@/services/admin-stats.service'
import { ApiError } from './fetcher'

export const adminStatsApi = {
    get: async (): Promise<AdminDashboardStats> => {
        const res = await fetch('/api/admin/stats')
        if (!res.ok) throw new ApiError(res.status, `GET /api/admin/stats → ${res.status}`)
        const json = await res.json()
        return json.data ?? json
    },
}
