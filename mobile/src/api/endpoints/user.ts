import { api } from '../client'

export interface UserProfile {
    id:              string
    name:            string | null
    email:           string | null
    image:           string | null
    role:            string
    createdAt:       string
    hasPassword:     boolean
    linkedProviders: string[]
    stats: {
        ratings?:          number
        favoriteCocktails?: number
        favoritedCocktails?: number
        madeLogs?:         number
        pantryItems?:      number
        plannedCocktails?: number
        suggestions?:      number
        [key: string]:     number | undefined
    }
}

export interface UserStats {
    thisWeek:      number
    thisMonth:     number
    thisYear:      number
    allTime:       number
    currentStreak: number
    longestStreak: number
    topCocktails:  { cocktailId: string; name: string; imageUrl: string | null; count: number; archived: boolean }[]
    weeklyTrend:   { label: string; drinks: number }[]
    monthlyTrend:  { label: string; drinks: number }[]
}

export const userApi = {
    getProfile: () =>
        api.get<{ success: true; data: UserProfile }>('/api/user/me/profile'),

    updateProfile: (payload: { name?: string; image?: string | null }) =>
        api.patch<{ success: true; data: { name: string | null; image: string | null } }>('/api/user/me', payload),

    changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
        api.post<{ success: true; data: { updated: boolean } }>('/api/user/me/change-password', {
            currentPassword,
            newPassword,
            confirmPassword,
        }),

    deleteAccount: (password?: string) =>
        api.delete('/api/user/me', { data: password ? { password } : {} }),

    registerDevice: (payload: { platform: string; fcmToken: string; expoToken?: string; appVersion?: string }) =>
        api.post('/api/devices', payload),

    unregisterDevice: (fcmToken: string) =>
        api.delete('/api/devices', { data: { fcmToken } }),

    getStats: () =>
        api.get<{ success: true; data: UserStats }>('/api/user/stats'),
}
