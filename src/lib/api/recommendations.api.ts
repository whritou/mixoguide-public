import type { Recommendations } from '@/services/recommendation.service'
import { ApiError } from './fetcher'

export const recommendationsApi = {
    get: async (): Promise<Recommendations> => {
        const res = await fetch('/api/cocktails/recommendations')
        if (!res.ok) throw new ApiError(res.status, `GET /api/cocktails/recommendations → ${res.status}`)
        const json = await res.json()
        return json.data ?? json
    },
}
