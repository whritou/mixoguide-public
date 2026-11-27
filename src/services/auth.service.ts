import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { User } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import { userRepository } from '@/repositories/user.repository'
import { verificationTokenRepository } from '@/repositories/verification-token.repository'
import { refreshTokenRepository } from '@/repositories/refresh-token.repository'
import { env, requireEnv } from '@/lib/env'
import { BadRequestError, NotFoundError } from '@/utils/errors'

type SessionPayload = Pick<User, 'id' | 'email' | 'name' | 'image' | 'role'> & { sessionVersion?: number }

/** What an email token may be used for. Tokens are bound to exactly one purpose (SEC-009). */
export type EmailTokenPurpose = 'verify' | 'reset'

interface SessionResult {
    token: string
    cookieName: string
    cookieOptions: {
        httpOnly: boolean
        secure: boolean
        path: string
        maxAge: number
        sameSite: 'lax' | 'strict' | 'none'
    }
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 30
const EMAIL_TOKEN_TTL = 15 * 60 * 1000

/**
 * NextAuth v4 reads `__Secure-next-auth.session-token` when NEXTAUTH_URL is
 * HTTPS and `next-auth.session-token` otherwise. Hand-minted sessions must use
 * the same name or they are silently ignored in production (SEC-010).
 */
export function sessionCookieName(): string {
    return shouldUseSecureCookies() ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
}

function shouldUseSecureCookies(): boolean {
    return env.NEXTAUTH_URL.startsWith('https://')
}

function identifierFor(purpose: EmailTokenPurpose, email: string): string {
    return `${purpose}:${email.trim().toLowerCase()}`
}

export class AuthService {
    async createSession(user: SessionPayload): Promise<SessionResult> {
        const token = await encode({
            secret: requireEnv('NEXTAUTH_SECRET', env.NEXTAUTH_SECRET),
            maxAge: SESSION_MAX_AGE,
            token: {
                sub: user.id,
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
                sv: user.sessionVersion ?? 0,
            },
        })

        return {
            token,
            cookieName: sessionCookieName(),
            cookieOptions: {
                httpOnly: true,
                secure: shouldUseSecureCookies(),
                path: '/',
                maxAge: SESSION_MAX_AGE,
                sameSite: 'lax',
            },
        }
    }

    /** Create a single-use, purpose-bound email token. Earlier tokens for the same purpose are invalidated. */
    async createEmailToken(email: string, purpose: EmailTokenPurpose): Promise<string> {
        const rawToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = this.hashToken(rawToken)
        const expires = new Date(Date.now() + EMAIL_TOKEN_TTL)
        const identifier = identifierFor(purpose, email)

        await verificationTokenRepository.deleteByIdentifier(identifier)
        await verificationTokenRepository.create(identifier, hashedToken, expires)

        return rawToken
    }

    /**
     * Atomically consume a token for the given purpose and return its user.
     * A token minted for another purpose is rejected and left untouched.
     */
    async consumeEmailToken(rawToken: string, purpose: EmailTokenPurpose): Promise<User> {
        const record = await verificationTokenRepository.consume(this.hashToken(rawToken), `${purpose}:`)
        if (!record) throw new BadRequestError('This link is invalid or has expired.')

        const email = record.identifier.slice(purpose.length + 1)
        const user = await userRepository.findByEmail(email)
        if (!user) throw new NotFoundError('User not found')

        return user
    }

    async markEmailVerified(userId: string): Promise<void> {
        const user = await userRepository.update(userId, { emailVerified: new Date() })
        if (!user) throw new NotFoundError('User not found')
    }

    /**
     * Set a new password and end every existing session: bumps sessionVersion
     * (invalidates web JWTs and mobile access tokens) and revokes all refresh
     * tokens (SEC-004). Returns the updated user for issuing a fresh session.
     */
    async setPasswordAndRevokeSessions(userId: string, newPassword: string) {
        const hashedPassword = await bcrypt.hash(newPassword, 12)
        const user = await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword, sessionVersion: { increment: 1 } },
            select: { id: true, email: true, name: true, image: true, role: true, sessionVersion: true },
        })
        await refreshTokenRepository.revokeAllForUser(userId)
        return user
    }

    async resetPassword(rawToken: string, newPassword: string) {
        const user = await this.consumeEmailToken(rawToken, 'reset')
        const updated = await this.setPasswordAndRevokeSessions(user.id, newPassword)
        // Completing a reset proves mailbox ownership.
        if (!user.emailVerified) await this.markEmailVerified(user.id)
        return updated
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex')
    }
}

export const authService = new AuthService()
