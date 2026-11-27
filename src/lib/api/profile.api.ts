import { api } from './fetcher'
import type { ProfileData } from '@/components/user/types'

export const profileApi = {
    /** Current user's profile with aggregate stats (GET /api/user/me/profile). */
    me: async (): Promise<ProfileData> => {
        const res = await api.get<ProfileData>('user/me/profile')
        return { ...res.data, hasPassword: res.data.hasPassword ?? false }
    },
}
