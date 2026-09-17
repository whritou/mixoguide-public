import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '@/api/endpoints/user'
import { keys } from '@/lib/query-keys'
import { useAuth } from '@/auth/useAuth'

export function useUserStats() {
    const { user } = useAuth()
    return useQuery({
        queryKey: keys.stats.all,
        queryFn:  () => userApi.getStats().then(r => r.data.data),
        enabled:  !!user,
        staleTime: 1000 * 60 * 5,
    })
}

export function useProfile() {
    const { user } = useAuth()
    return useQuery({
        queryKey: keys.profile.me,
        queryFn:  () => userApi.getProfile().then(r => r.data.data),
        enabled:  !!user,
        staleTime: 1000 * 60 * 5,
    })
}

export function useUpdateProfile() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload: { name?: string; image?: string | null }) =>
            userApi.updateProfile(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile.me }),
    })
}

export function useChangePassword() {
    return useMutation({
        mutationFn: ({
            currentPassword,
            newPassword,
            confirmPassword,
        }: {
            currentPassword: string
            newPassword:     string
            confirmPassword: string
        }) => userApi.changePassword(currentPassword, newPassword, confirmPassword),
    })
}

export function useDeleteAccount() {
    return useMutation({
        mutationFn: (password?: string) => userApi.deleteAccount(password),
    })
}
