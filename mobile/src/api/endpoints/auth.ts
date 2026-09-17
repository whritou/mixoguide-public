import { api } from '../client'

export interface MobileUser {
    id: string
    email: string | null
    name: string | null
    image: string | null
    role: string
}

interface LoginResponse {
    accessToken: string
    refreshToken: string
    user: MobileUser
}

interface RefreshResponse {
    accessToken: string
    refreshToken: string
    user?: MobileUser
}

export const authApi = {
    login: (email: string, password: string) =>
        api.post<{ success: true; data: LoginResponse }>('/api/auth/mobile/login', { email, password }),

    googleIdToken: (idToken: string) =>
        api.post<{ success: true; data: LoginResponse }>('/api/auth/mobile/oauth/google/id-token', { idToken }),

    register: (email: string, name: string, password: string) =>
        api.post('/api/auth/mobile/register', { email, name, password }),

    refresh: (refreshToken: string) =>
        api.post<{ success: true; data: RefreshResponse }>('/api/auth/mobile/refresh', { refreshToken }),

    logout: (refreshToken: string) =>
        api.post('/api/auth/mobile/logout', { refreshToken }),

    requestReset: (email: string) =>
        api.post('/api/auth/mobile/request-reset', { email }),

    resetPassword: (token: string, password: string, passwordConfirm: string) =>
        api.post('/api/auth/mobile/reset-password', { token, password, passwordConfirm }),
}
