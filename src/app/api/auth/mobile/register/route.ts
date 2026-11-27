import { NextRequest } from 'next/server'

import { userService } from '@/services/user.service'
import { authService } from '@/services/auth.service'
import { mailService } from '@/services/mail.service'
import { publicRegisterSchema } from '@/validations/auth.validation'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { enforceCredentialPolicy } from '@/lib/auth/credentialPolicy'

const ACCEPTED = { message: 'Account created. Please verify your email before signing in.' }

export const POST = withErrorHandler(async (req: NextRequest) => {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    await enforceCredentialPolicy(req, {
        channel: 'mobile',
        action: 'mobile-register',
        turnstileToken: body.turnstileToken,
        turnstileAction: 'signup',
    })

    const data = publicRegisterSchema.parse(body)

    // Uniform response for existing emails; no user id is returned (SEC-008).
    const existing = await userService.findByEmail(data.email)
    if (existing) {
        await mailService.sendAccountExistsEmail(existing.email).catch((error: unknown) =>
            console.error('[MobileRegister] account-exists notice failed', error))
        return ApiResponse.created(ACCEPTED)
    }

    const user = await userService.create({
        email: data.email,
        name: data.name,
        password: data.password,
        role: 'USER',
    })

    const token = await authService.createEmailToken(user.email, 'verify')
    await mailService.sendVerificationEmail(user.email, token, '/')

    return ApiResponse.created(ACCEPTED)
})
