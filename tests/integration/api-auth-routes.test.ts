import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UnauthorizedError } from '@/utils/errors'
import { csrfHeaders, jsonBody, nextRequest, routeContext } from '../factories/auth'

const {
    mockAuthService,
    mockCheckRateLimit,
    mockGetIp,
    mockMailService,
    mockMobileAuthService,
    mockPantryService,
    mockSendResetPasswordEmail,
    mockSendVerificationEmail,
    mockUserRepository,
    mockUserService,
    mockVerifyTurnstileToken,
} = vi.hoisted(() => ({
    mockAuthService: {
        consumeToken: vi.fn(),
        createEmailToken: vi.fn(),
        createSession: vi.fn(),
        markEmailVerified: vi.fn(),
        resetPassword: vi.fn(),
        verifyEmailToken: vi.fn(),
    },
    mockCheckRateLimit: vi.fn(),
    mockGetIp: vi.fn(),
    mockMobileAuthService: {
        createAccessToken: vi.fn(),
        createRefreshToken: vi.fn(),
        renewRefreshToken: vi.fn(),
        revokeRefreshToken: vi.fn(),
    },
    mockMailService: {
        sendResetPasswordEmail: vi.fn(),
        sendVerificationEmail: vi.fn(),
    },
    mockPantryService: {
        importDemoBar: vi.fn(),
    },
    mockSendResetPasswordEmail: vi.fn(),
    mockSendVerificationEmail: vi.fn(),
    mockUserRepository: {
        findById: vi.fn(),
    },
    mockUserService: {
        create: vi.fn(),
        getByEmail: vi.fn(),
        verifyPassword: vi.fn(),
    },
    mockVerifyTurnstileToken: vi.fn(),
}))

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: mockCheckRateLimit,
    getIp: mockGetIp,
}))

vi.mock('@/services/auth.service', () => ({ authService: mockAuthService }))
vi.mock('@/services/mail.service', () => ({ mailService: mockMailService }))
vi.mock('@/services/pantry.service', () => ({ pantryService: mockPantryService }))
vi.mock('@/services/user.service', () => ({ userService: mockUserService }))
vi.mock('@/services/mobile-auth.service', () => ({ mobileAuthService: mockMobileAuthService }))
vi.mock('@/repositories/user.repository', () => ({ userRepository: mockUserRepository }))
vi.mock('@/utils/turnstile', () => ({ verifyTurnstileToken: mockVerifyTurnstileToken }))
vi.mock('@/utils/mail', () => ({
    sendResetPasswordEmail: mockSendResetPasswordEmail,
    sendVerificationEmail: mockSendVerificationEmail,
}))

import { POST as webLogin } from '@/app/api/auth/login/route'
import { POST as webRegister } from '@/app/api/auth/register/route'
import { POST as webRequestReset } from '@/app/api/auth/request-reset-password/route'
import { POST as webResetPassword } from '@/app/api/auth/reset-password/route'
import { GET as verifyEmail } from '@/app/api/auth/verify-email/route'
import { POST as mobileLogin } from '@/app/api/auth/mobile/login/route'
import { POST as mobileLogout } from '@/app/api/auth/mobile/logout/route'
import { POST as mobileRefresh } from '@/app/api/auth/mobile/refresh/route'
import { POST as mobileRegister } from '@/app/api/auth/mobile/register/route'
import { POST as mobileRequestReset } from '@/app/api/auth/mobile/request-reset/route'
import { POST as mobileResetPassword } from '@/app/api/auth/mobile/reset-password/route'

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.clearAllMocks()

    mockCheckRateLimit.mockResolvedValue(undefined)
    mockGetIp.mockReturnValue('203.0.113.8')
    mockVerifyTurnstileToken.mockResolvedValue(true)

    mockUserService.verifyPassword.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        emailVerified: new Date('2026-05-01T00:00:00.000Z'),
        name: 'User',
        image: null,
        role: 'USER',
    })
    mockUserService.create.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
    })
    mockUserService.getByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
    })

    mockAuthService.createSession.mockResolvedValue({
        token: 'session-token',
        cookieOptions: {
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
            secure: false,
        },
    })
    mockAuthService.createEmailToken.mockResolvedValue('email-token')
    mockAuthService.resetPassword.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        image: null,
        role: 'USER',
    })
    mockAuthService.verifyEmailToken.mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', name: 'User', image: null, role: 'USER' },
        hashedToken: 'hashed-token',
    })
    mockAuthService.markEmailVerified.mockResolvedValue(undefined)
    mockAuthService.consumeToken.mockResolvedValue(undefined)

    mockSendVerificationEmail.mockResolvedValue(undefined)
    mockSendResetPasswordEmail.mockResolvedValue(undefined)
    mockMailService.sendVerificationEmail.mockResolvedValue(undefined)
    mockMailService.sendResetPasswordEmail.mockResolvedValue(undefined)

    mockMobileAuthService.createAccessToken.mockResolvedValue('mobile-access')
    mockMobileAuthService.createRefreshToken.mockResolvedValue('mobile-refresh')
    mockMobileAuthService.renewRefreshToken.mockResolvedValue({
        refreshToken: 'mobile-refresh-next',
        userId: 'user-1',
    })
    mockMobileAuthService.revokeRefreshToken.mockResolvedValue(undefined)
    mockUserRepository.findById.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        image: null,
        role: 'USER',
    })

})

describe('web auth routes', () => {
    it('returns 401 for invalid login credentials', async () => {
        mockUserService.verifyPassword.mockResolvedValueOnce(null)

        const response = await webLogin(
            nextRequest({
                method: 'POST',
                path: '/api/auth/login',
                headers: csrfHeaders(),
                body: { email: 'user@example.com', password: 'wrong' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(401)
    })

    it('returns 403 when email is not verified on login', async () => {
        mockUserService.verifyPassword.mockResolvedValueOnce({
            id: 'user-1',
            email: 'user@example.com',
            emailVerified: null,
            name: 'User',
            image: null,
            role: 'USER',
        })

        const response = await webLogin(
            nextRequest({
                method: 'POST',
                path: '/api/auth/login',
                headers: csrfHeaders(),
                body: { email: 'user@example.com', password: 'secret' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(403)
    })

    it('creates a session cookie on successful login', async () => {
        const response = await webLogin(
            nextRequest({
                method: 'POST',
                path: '/api/auth/login',
                headers: csrfHeaders(),
                body: { email: 'user@example.com', password: 'secret' },
            }),
            routeContext(),
        )
        const body = await jsonBody<{ success: boolean }>(response)

        expect(response.status).toBe(200)
        expect(body.success).toBe(true)
        expect(response.headers.get('set-cookie')).toContain('next-auth.session-token=session-token')
    })

    it('rejects register when captcha validation fails', async () => {
        mockVerifyTurnstileToken.mockResolvedValueOnce(false)

        const response = await webRegister(
            nextRequest({
                method: 'POST',
                path: '/api/auth/register',
                body: {
                    name: 'User',
                    email: 'user@example.com',
                    password: 'password123',
                    passwordConfirm: 'password123',
                    turnstileToken: 'captcha-token',
                },
            }),
            routeContext(),
        )

        expect(response.status).toBe(422)
        expect(mockUserService.create).not.toHaveBeenCalled()
    })

    it('creates a user and sends verification email on successful register', async () => {
        const response = await webRegister(
            nextRequest({
                method: 'POST',
                path: '/api/auth/register',
                body: {
                    name: 'User',
                    email: 'user@example.com',
                    password: 'password123',
                    passwordConfirm: 'password123',
                    turnstileToken: 'captcha-token',
                    callbackUrl: '/verify-email',
                },
            }),
            routeContext(),
        )

        expect(response.status).toBe(201)
        expect(mockUserService.create).toHaveBeenCalled()
        expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith('user@example.com', 'email-token', '/verify-email')
    })

    it('ignores privileged fields on register and always creates a USER', async () => {
        const response = await webRegister(
            nextRequest({
                method: 'POST',
                path: '/api/auth/register',
                body: {
                    name: 'User',
                    email: 'user@example.com',
                    password: 'password123',
                    passwordConfirm: 'password123',
                    turnstileToken: 'captcha-token',
                    role: 'ADMIN',
                    emailVerified: '2026-01-01T00:00:00.000Z',
                },
            }),
            routeContext(),
        )

        expect(response.status).toBe(201)
        expect(mockUserService.create).toHaveBeenCalledTimes(1)
        const created = mockUserService.create.mock.calls[0][0]
        expect(created.role).toBe('USER')
        expect(created).not.toHaveProperty('emailVerified')
    })

    it('returns 204 for request reset and does not leak unknown emails', async () => {
        mockUserService.getByEmail.mockRejectedValueOnce(new UnauthorizedError('Not found'))

        const response = await webRequestReset(
            nextRequest({
                method: 'POST',
                path: '/api/auth/request-reset-password',
                body: { email: 'missing@example.com' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(204)
        expect(mockMailService.sendResetPasswordEmail).not.toHaveBeenCalled()
    })

    it('resets password and returns a session cookie', async () => {
        const response = await webResetPassword(
            nextRequest({
                method: 'POST',
                path: '/api/auth/reset-password',
                headers: csrfHeaders(),
                body: { token: 'reset-token', password: 'NewPassword123', passwordConfirm: 'NewPassword123' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(200)
        expect(response.headers.get('set-cookie')).toContain('next-auth.session-token=session-token')
    })

    it('verifies email token, consumes token, and redirects', async () => {
        const response = await verifyEmail(
            nextRequest({
                method: 'GET',
                path: '/api/auth/verify-email?token=raw-token&callbackUrl=%2Fuser',
            }),
            routeContext(),
        )

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('https://mixoguide.com/user')
        expect(response.headers.get('set-cookie')).toContain('next-auth.session-token=session-token')
    })
})

describe('mobile auth routes', () => {
    it('returns mobile access and refresh tokens on login', async () => {
        const response = await mobileLogin(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/login',
                headers: { 'x-device-id': 'device-1' },
                body: { email: 'user@example.com', password: 'password123' },
            }),
            routeContext(),
        )
        const body = await jsonBody<{ data: { accessToken: string; refreshToken: string } }>(response)

        expect(response.status).toBe(200)
        expect(body.data.accessToken).toBe('mobile-access')
        expect(body.data.refreshToken).toBe('mobile-refresh')
    })

    it('returns 401 on invalid refresh token', async () => {
        mockMobileAuthService.renewRefreshToken.mockRejectedValueOnce(new Error('INVALID_REFRESH_TOKEN'))

        const response = await mobileRefresh(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/refresh',
                body: { refreshToken: 'expired' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(401)
    })

    it('returns refreshed mobile session payload', async () => {
        const response = await mobileRefresh(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/refresh',
                headers: { 'x-device-id': 'device-1' },
                body: { refreshToken: 'refresh-token' },
            }),
            routeContext(),
        )
        const body = await jsonBody<{ data: { accessToken: string; refreshToken: string } }>(response)

        expect(response.status).toBe(200)
        expect(body.data.accessToken).toBe('mobile-access')
        expect(body.data.refreshToken).toBe('mobile-refresh-next')
    })

    it('revokes refresh token on logout when provided', async () => {
        const response = await mobileLogout(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/logout',
                body: { refreshToken: 'refresh-token' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(204)
        expect(mockMobileAuthService.revokeRefreshToken).toHaveBeenCalledWith('refresh-token')
    })

    it('creates mobile account and sends verification email', async () => {
        const response = await mobileRegister(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/register',
                body: {
                    email: 'user@example.com',
                    name: 'User',
                    password: 'password123',
                    passwordConfirm: 'password123',
                },
            }),
            routeContext(),
        )
        const body = await jsonBody<{ data: { userId: string } }>(response)

        expect(response.status).toBe(201)
        expect(body.data.userId).toBe('user-1')
        expect(mockSendVerificationEmail).toHaveBeenCalled()
    })

    it('ignores privileged fields on mobile register and always creates a USER', async () => {
        const response = await mobileRegister(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/register',
                body: {
                    email: 'user@example.com',
                    name: 'User',
                    password: 'password123',
                    passwordConfirm: 'password123',
                    role: 'ADMIN',
                    emailVerified: '2026-01-01T00:00:00.000Z',
                },
            }),
            routeContext(),
        )

        expect(response.status).toBe(201)
        expect(mockUserService.create).toHaveBeenCalledTimes(1)
        const created = mockUserService.create.mock.calls[0][0]
        expect(created.role).toBe('USER')
        expect(created).not.toHaveProperty('emailVerified')
    })

    it('sends mobile reset email when user exists', async () => {
        const response = await mobileRequestReset(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/request-reset',
                body: { email: 'user@example.com' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(204)
        expect(mockSendResetPasswordEmail).toHaveBeenCalledTimes(1)
    })

    it('resets mobile password without requiring CSRF headers', async () => {
        const response = await mobileResetPassword(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/reset-password',
                body: { token: 'reset-token', password: 'NewPassword123', passwordConfirm: 'NewPassword123' },
            }),
            routeContext(),
        )
        const body = await jsonBody<{ data: { message: string } }>(response)

        expect(response.status).toBe(200)
        expect(body.data.message).toContain('Password reset successfully')
    })

})

describe('register with a demo bar', () => {
    const register = (extra: Record<string, unknown> = {}) =>
        webRegister(
            nextRequest({
                method: 'POST',
                path: '/api/auth/register',
                body: {
                    name: 'User',
                    email: 'user@example.com',
                    password: 'password123',
                    passwordConfirm: 'password123',
                    turnstileToken: 'captcha-token',
                    ...extra,
                },
            }),
            routeContext(),
        )

    beforeEach(() => {
        mockPantryService.importDemoBar.mockResolvedValue({ imported: 1 })
    })

    it('imports the demo bar for the new user after creating the account', async () => {
        const response = await register({ demoBar: ['gin'] })

        expect(response.status).toBe(201)
        expect(mockPantryService.importDemoBar).toHaveBeenCalledWith('user-1', ['gin'])
        expect(mockUserService.create.mock.invocationCallOrder[0])
            .toBeLessThan(mockPantryService.importDemoBar.mock.invocationCallOrder[0])
    })

    it('registers normally and skips the import when the demo bar is invalid', async () => {
        const response = await register({ demoBar: 'gin' })

        expect(response.status).toBe(201)
        expect(mockUserService.create).toHaveBeenCalled()
        expect(mockPantryService.importDemoBar).not.toHaveBeenCalled()
        expect(mockMailService.sendVerificationEmail).toHaveBeenCalled()
    })

    it('still registers and sends the verification email when the import fails', async () => {
        mockPantryService.importDemoBar.mockRejectedValueOnce(new Error('db down'))

        const response = await register({ demoBar: ['gin'] })

        expect(response.status).toBe(201)
        expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith('user@example.com', 'email-token', '/')
    })

    it('skips the import when no demo bar is sent', async () => {
        const response = await register()

        expect(response.status).toBe(201)
        expect(mockPantryService.importDemoBar).not.toHaveBeenCalled()
    })

    it('skips the import for an empty demo bar', async () => {
        const response = await register({ demoBar: [] })

        expect(response.status).toBe(201)
        expect(mockPantryService.importDemoBar).not.toHaveBeenCalled()
    })
})
