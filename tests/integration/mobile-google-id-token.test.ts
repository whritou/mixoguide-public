import { beforeEach, describe, expect, it, vi } from 'vitest'

import { jsonBody, nextRequest, routeContext } from '../factories/auth'

const {
    mockCheckRateLimit,
    mockCreateAccessToken,
    mockCreateRefreshToken,
    mockFindUser,
    mockGetOrCreateGoogleUser,
    mockVerifyGoogleIdToken,
} = vi.hoisted(() => ({
    mockCheckRateLimit: vi.fn(),
    mockCreateAccessToken: vi.fn(),
    mockCreateRefreshToken: vi.fn(),
    mockFindUser: vi.fn(),
    mockGetOrCreateGoogleUser: vi.fn(),
    mockVerifyGoogleIdToken: vi.fn(),
}))

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: mockCheckRateLimit,
    getIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/db/prisma', () => ({
    prisma: {
        user: {
            findUnique: mockFindUser,
        },
    },
}))

vi.mock('@/services/mobile-auth.service', () => ({
    mobileAuthService: {
        createAccessToken: mockCreateAccessToken,
        createRefreshToken: mockCreateRefreshToken,
    },
}))

vi.mock('@/app/api/auth/mobile/oauth/google/utils', () => ({
    getOrCreateGoogleUserFromVerifiedProfile: mockGetOrCreateGoogleUser,
    verifyGoogleIdToken: mockVerifyGoogleIdToken,
}))

import { POST as googleIdTokenLogin } from '@/app/api/auth/mobile/oauth/google/id-token/route'

describe('mobile Google ID-token login route', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.clearAllMocks()
        mockCheckRateLimit.mockResolvedValue(undefined)
        mockVerifyGoogleIdToken.mockResolvedValue({
            sub: 'google-sub-1',
            email: 'user@example.com',
            emailVerified: true,
            name: 'Google User',
            picture: 'https://lh3.googleusercontent.com/a/user',
        })
        mockGetOrCreateGoogleUser.mockResolvedValue({ id: 'user-1' })
        mockFindUser.mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            name: 'Google User',
            image: null,
            role: 'USER',
        })
        mockCreateAccessToken.mockResolvedValue('mobile-access')
        mockCreateRefreshToken.mockResolvedValue('mobile-refresh')
    })

    it('verifies the Google ID token and returns the standard mobile session payload', async () => {
        const response = await googleIdTokenLogin(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/oauth/google/id-token',
                headers: { 'x-device-id': 'device-1' },
                body: { idToken: 'google.jwt' },
            }),
            routeContext()
        )
        const body = await jsonBody<{ data: { accessToken: string; refreshToken: string } }>(response)

        expect(response.status).toBe(200)
        expect(mockVerifyGoogleIdToken).toHaveBeenCalledWith('google.jwt')
        expect(mockGetOrCreateGoogleUser).toHaveBeenCalledWith(
            expect.objectContaining({ sub: 'google-sub-1' }),
            { id_token: 'google.jwt' }
        )
        expect(mockCreateRefreshToken).toHaveBeenCalledWith('user-1', 'device-1')
        expect(body.data).toMatchObject({
            accessToken: 'mobile-access',
            refreshToken: 'mobile-refresh',
        })
    })

    it('rejects requests without a mobile device id', async () => {
        const response = await googleIdTokenLogin(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/oauth/google/id-token',
                body: { idToken: 'google.jwt' },
            }),
            routeContext()
        )

        expect(response.status).toBe(401)
        expect(mockVerifyGoogleIdToken).not.toHaveBeenCalled()
    })
})
