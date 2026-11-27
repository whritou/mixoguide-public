import { beforeEach, describe, expect, it, vi } from 'vitest'
import { csrfHeaders, jsonBody, nextRequest, routeContext } from '../factories/auth'

const {
    mockAuthService,
    mockCheckRateLimit,
    mockGetIp,
    mockMailService,
    mockMobileAuthService,
    mockPantryService,
    mockUserRepository,
    mockUserService,
    mockVerifyTurnstileToken,
} = vi.hoisted(() => ({
    mockAuthService: {
        consumeEmailToken: vi.fn(),
        createEmailToken: vi.fn(),
        createSession: vi.fn(),
        markEmailVerified: vi.fn(),
        resetPassword: vi.fn(),
    },
    mockCheckRateLimit: vi.fn(),
    mockGetIp: vi.fn(),
    mockMobileAuthService: {
        createAccessToken: vi.fn(),
        createRefreshToken: vi.fn(),
        rotateRefreshToken: vi.fn(),
        revokeRefreshToken: vi.fn(),
    },
    mockMailService: {
        sendAccountExistsEmail: vi.fn(),
        sendResetPasswordEmail: vi.fn(),
        sendVerificationEmail: vi.fn(),
    },
    mockPantryService: {
        importDemoBar: vi.fn(),
    },
    mockUserRepository: {
        findById: vi.fn(),
    },
    mockUserService: {
        create: vi.fn(),
        findByEmail: vi.fn(),
        verifyPassword: vi.fn(),
    },
    mockVerifyTurnstileToken: vi.fn(),
}))

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: mockCheckRateLimit,
    rateLimit: mockCheckRateLimit,
    getIp: mockGetIp,
}))

vi.mock('@/services/auth.service', () => ({ authService: mockAuthService }))
vi.mock('@/services/mail.service', () => ({ mailService: mockMailService }))
vi.mock('@/services/pantry.service', () => ({ pantryService: mockPantryService }))
vi.mock('@/services/user.service', () => ({ userService: mockUserService }))
vi.mock('@/services/mobile-auth.service', () => ({ mobileAuthService: mockMobileAuthService }))
vi.mock('@/repositories/user.repository', () => ({ userRepository: mockUserRepository }))
vi.mock('@/utils/turnstile', () => ({ verifyTurnstileToken: mockVerifyTurnstileToken }))

import { POST as webRegister } from '@/app/api/auth/register/route'
import { POST as webRequestReset } from '@/app/api/auth/request-reset-password/route'
import { POST as webResetPassword } from '@/app/api/auth/reset-password/route'
import { POST as resendVerification } from '@/app/api/auth/resend-verification/route'
import { GET as verifyEmailGet, POST as verifyEmailPost } from '@/app/api/auth/verify-email/route'
import { POST as mobileLogin } from '@/app/api/auth/mobile/login/route'
import { POST as mobileLogout } from '@/app/api/auth/mobile/logout/route'
import { POST as mobileRefresh } from '@/app/api/auth/mobile/refresh/route'
import { POST as mobileRegister } from '@/app/api/auth/mobile/register/route'
import { POST as mobileRequestReset } from '@/app/api/auth/mobile/request-reset/route'
import { POST as mobileResetPassword } from '@/app/api/auth/mobile/reset-password/route'

const verifiedUser = {
    id: 'user-1',
    email: 'user@example.com',
    emailVerified: new Date('2026-05-01T00:00:00.000Z'),
    name: 'User',
    image: null,
    role: 'USER',
}

const registerBody = {
    name: 'User',
    email: 'user@example.com',
    password: 'password123',
    passwordConfirm: 'password123',
    turnstileToken: 'captcha-token',
}

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.clearAllMocks()
    vi.unstubAllEnvs()

    mockCheckRateLimit.mockResolvedValue(undefined)
    mockGetIp.mockReturnValue('203.0.113.8')
    mockVerifyTurnstileToken.mockResolvedValue(true)

    mockUserService.verifyPassword.mockResolvedValue(verifiedUser)
    mockUserService.create.mockResolvedValue({ id: 'user-1', email: 'user@example.com', name: 'User' })
    mockUserService.findByEmail.mockResolvedValue(null)

    mockAuthService.createSession.mockResolvedValue({
        token: 'session-token',
        cookieName: '__Secure-next-auth.session-token',
        cookieOptions: { httpOnly: true, path: '/', sameSite: 'lax', secure: true },
    })
    mockAuthService.createEmailToken.mockResolvedValue('email-token')
    mockAuthService.resetPassword.mockResolvedValue({ ...verifiedUser, sessionVersion: 1 })
    mockAuthService.consumeEmailToken.mockResolvedValue(verifiedUser)
    mockAuthService.markEmailVerified.mockResolvedValue(undefined)

    mockMailService.sendVerificationEmail.mockResolvedValue(undefined)
    mockMailService.sendResetPasswordEmail.mockResolvedValue(undefined)
    mockMailService.sendAccountExistsEmail.mockResolvedValue(undefined)

    mockMobileAuthService.createAccessToken.mockResolvedValue('mobile-access')
    mockMobileAuthService.createRefreshToken.mockResolvedValue('mobile-refresh')
    mockMobileAuthService.rotateRefreshToken.mockResolvedValue({ refreshToken: 'mobile-refresh-next', userId: 'user-1' })
    mockMobileAuthService.revokeRefreshToken.mockResolvedValue(undefined)
    mockUserRepository.findById.mockResolvedValue(verifiedUser)
})

describe('web registration', () => {
    const register = (body: Record<string, unknown> = {}, headers: Record<string, string> = csrfHeaders()) =>
        webRegister(
            nextRequest({ method: 'POST', path: '/api/auth/register', headers, body: { ...registerBody, ...body } }),
            routeContext(),
        )

    it('rejects register with 403 when captcha validation fails', async () => {
        mockVerifyTurnstileToken.mockResolvedValueOnce(false)

        const response = await register()

        expect(response.status).toBe(403)
        expect(mockUserService.create).not.toHaveBeenCalled()
    })

    it('verifies the captcha against the "signup" widget action', async () => {
        await register()
        expect(mockVerifyTurnstileToken).toHaveBeenCalledWith('captcha-token', '203.0.113.8', 'signup')
    })

    it('rejects cross-site registration (CSRF)', async () => {
        const response = await register({}, { origin: 'https://evil.example', host: 'mixoguide.com' })
        expect(response.status).toBe(403)
        expect(mockUserService.create).not.toHaveBeenCalled()
    })

    it('rejects registration without a password', async () => {
        const response = await register({ password: undefined })
        expect(response.status).toBe(422)
        expect(mockUserService.create).not.toHaveBeenCalled()
    })

    it('creates a user and sends a purpose-bound verification email', async () => {
        const response = await register({ callbackUrl: '/cocktails' })

        expect(response.status).toBe(201)
        expect(mockUserService.create).toHaveBeenCalled()
        expect(mockAuthService.createEmailToken).toHaveBeenCalledWith('user@example.com', 'verify')
        expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith('user@example.com', 'email-token', '/cocktails')
    })

    it('answers identically for an existing email and notifies the owner instead (no enumeration)', async () => {
        const fresh = await register()
        const freshBody = await jsonBody(fresh)

        vi.clearAllMocks()
        mockCheckRateLimit.mockResolvedValue(undefined)
        mockVerifyTurnstileToken.mockResolvedValue(true)
        mockMailService.sendAccountExistsEmail.mockResolvedValue(undefined)
        mockUserService.findByEmail.mockResolvedValueOnce(verifiedUser)

        const existing = await register()

        expect(existing.status).toBe(fresh.status)
        expect(await jsonBody(existing)).toEqual(freshBody)
        expect(mockUserService.create).not.toHaveBeenCalled()
        expect(mockMailService.sendAccountExistsEmail).toHaveBeenCalledWith('user@example.com')
    })

    it('ignores privileged fields on register and always creates a USER', async () => {
        const response = await register({ role: 'ADMIN', emailVerified: '2026-01-01T00:00:00.000Z' })

        expect(response.status).toBe(201)
        const created = mockUserService.create.mock.calls[0][0]
        expect(created.role).toBe('USER')
        expect(created).not.toHaveProperty('emailVerified')
    })
})

describe('password reset and verification', () => {
    it('returns 204 for request reset and does not leak unknown emails', async () => {
        const response = await webRequestReset(
            nextRequest({
                method: 'POST',
                path: '/api/auth/request-reset-password',
                headers: csrfHeaders(),
                body: { email: 'missing@example.com' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(204)
        expect(mockMailService.sendResetPasswordEmail).not.toHaveBeenCalled()
    })

    it('mints a reset-purpose token for existing users', async () => {
        mockUserService.findByEmail.mockResolvedValueOnce(verifiedUser)
        const response = await webRequestReset(
            nextRequest({
                method: 'POST',
                path: '/api/auth/request-reset-password',
                headers: csrfHeaders(),
                body: { email: 'user@example.com' },
            }),
            routeContext(),
        )
        expect(response.status).toBe(204)
        expect(mockAuthService.createEmailToken).toHaveBeenCalledWith('user@example.com', 'reset')
    })

    it('resend-verification returns 204 for unknown, unverified and verified emails alike', async () => {
        const call = () => resendVerification(
            nextRequest({
                method: 'POST',
                path: '/api/auth/resend-verification',
                headers: csrfHeaders(),
                body: { email: 'user@example.com', callbackUrl: '/' },
            }),
            routeContext(),
        )

        mockUserService.findByEmail.mockResolvedValueOnce(null)
        expect((await call()).status).toBe(204)
        mockUserService.findByEmail.mockResolvedValueOnce({ ...verifiedUser, emailVerified: null })
        expect((await call()).status).toBe(204)
        mockUserService.findByEmail.mockResolvedValueOnce(verifiedUser)
        expect((await call()).status).toBe(204)

        expect(mockMailService.sendVerificationEmail).toHaveBeenCalledTimes(1)
    })

    it('resets password and sets the session cookie NextAuth actually reads', async () => {
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
        expect(response.headers.get('set-cookie')).toContain('__Secure-next-auth.session-token=session-token')
    })

    it('verify-email GET has no side effects and forwards to the confirmation page', async () => {
        const response = await verifyEmailGet(
            nextRequest({ method: 'GET', path: '/api/auth/verify-email?token=raw-token&callbackUrl=%2Fuser' }),
            routeContext(),
        )

        expect(response.status).toBe(307)
        const location = new URL(response.headers.get('location')!)
        expect(location.pathname).toBe('/verify-email')
        expect(location.searchParams.get('token')).toBe('raw-token')
        expect(location.searchParams.get('callbackUrl')).toBe('/user')
        expect(mockAuthService.consumeEmailToken).not.toHaveBeenCalled()
        expect(response.headers.get('set-cookie')).toBeNull()
    })

    it('verify-email POST consumes a verify-purpose token and signs in', async () => {
        const response = await verifyEmailPost(
            nextRequest({
                method: 'POST',
                path: '/api/auth/verify-email',
                headers: csrfHeaders(),
                body: { token: 'raw-token', callbackUrl: '/user' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(200)
        expect(mockAuthService.consumeEmailToken).toHaveBeenCalledWith('raw-token', 'verify')
        expect(mockAuthService.markEmailVerified).toHaveBeenCalledWith('user-1')
        expect(response.headers.get('set-cookie')).toContain('__Secure-next-auth.session-token=session-token')
        expect((await jsonBody<{ data: { redirectTo: string } }>(response)).data.redirectTo).toBe('/user')
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

    it('applies a per-account throttle on mobile login', async () => {
        await mobileLogin(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/login',
                body: { email: 'User@Example.com', password: 'password123' },
            }),
            routeContext(),
        )
        expect(mockCheckRateLimit).toHaveBeenCalledWith('signin-account', 'user@example.com')
    })

    it('requires a captcha on mobile login once MOBILE_CAPTCHA_REQUIRED=1', async () => {
        vi.stubEnv('MOBILE_CAPTCHA_REQUIRED', '1')
        mockVerifyTurnstileToken.mockResolvedValueOnce(false)

        const response = await mobileLogin(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/login',
                body: { email: 'user@example.com', password: 'password123' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(403)
        expect(mockUserService.verifyPassword).not.toHaveBeenCalled()
    })

    it('returns 401 on invalid refresh token', async () => {
        mockMobileAuthService.rotateRefreshToken.mockRejectedValueOnce(new Error('INVALID_REFRESH_TOKEN'))

        const response = await mobileRefresh(
            nextRequest({ method: 'POST', path: '/api/auth/mobile/refresh', body: { refreshToken: 'expired' } }),
            routeContext(),
        )

        expect(response.status).toBe(401)
    })

    it('rotates the refresh token on refresh', async () => {
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
        expect(mockMobileAuthService.rotateRefreshToken).toHaveBeenCalledWith('refresh-token', 'device-1')
    })

    it('revokes refresh token on logout when provided', async () => {
        const response = await mobileLogout(
            nextRequest({ method: 'POST', path: '/api/auth/mobile/logout', body: { refreshToken: 'refresh-token' } }),
            routeContext(),
        )

        expect(response.status).toBe(204)
        expect(mockMobileAuthService.revokeRefreshToken).toHaveBeenCalledWith('refresh-token')
    })

    it('creates mobile account, sends verification email and does not return a user id', async () => {
        const response = await mobileRegister(
            nextRequest({ method: 'POST', path: '/api/auth/mobile/register', body: registerBody }),
            routeContext(),
        )
        const body = await jsonBody<{ data: Record<string, unknown> }>(response)

        expect(response.status).toBe(201)
        expect(body.data).not.toHaveProperty('userId')
        expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith('user@example.com', 'email-token', '/')
    })

    it('ignores privileged fields on mobile register and always creates a USER', async () => {
        const response = await mobileRegister(
            nextRequest({
                method: 'POST',
                path: '/api/auth/mobile/register',
                body: { ...registerBody, role: 'ADMIN', emailVerified: '2026-01-01T00:00:00.000Z' },
            }),
            routeContext(),
        )

        expect(response.status).toBe(201)
        const created = mockUserService.create.mock.calls[0][0]
        expect(created.role).toBe('USER')
        expect(created).not.toHaveProperty('emailVerified')
    })

    it('sends a mobile reset email when user exists', async () => {
        mockUserService.findByEmail.mockResolvedValueOnce(verifiedUser)
        const response = await mobileRequestReset(
            nextRequest({ method: 'POST', path: '/api/auth/mobile/request-reset', body: { email: 'user@example.com' } }),
            routeContext(),
        )

        expect(response.status).toBe(204)
        expect(mockMailService.sendResetPasswordEmail).toHaveBeenCalledWith('user@example.com', 'email-token', { source: 'mobile' })
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
                headers: csrfHeaders(),
                body: { ...registerBody, ...extra },
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
