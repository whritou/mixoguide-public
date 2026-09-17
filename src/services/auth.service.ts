import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { User } from '@prisma/client'

import { userRepository } from '@/repositories/user.repository'
import { verificationTokenRepository } from '@/repositories/verification-token.repository'
import { env, requireEnv } from '@/lib/env'
import { BadRequestError, NotFoundError } from '@/utils/errors'

type SessionPayload = Pick<User, 'id' | 'email' | 'name' | 'image' | 'role'>

interface SessionResult {
    token: string
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
            },
        })

        return {
            token,
            cookieOptions: {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: SESSION_MAX_AGE,
                sameSite: 'lax',
            },
        }
    }

    async createEmailToken(email: string): Promise<string> {
        const rawToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = this.hashToken(rawToken)
        const expires = new Date(Date.now() + EMAIL_TOKEN_TTL)

        await verificationTokenRepository.deleteByIdentifier(email)
        await verificationTokenRepository.create(email, hashedToken, expires)

        return rawToken
    }

    async verifyEmailToken(rawToken: string): Promise<{ user: User; hashedToken: string }> {
        const hashedToken = this.hashToken(rawToken)

        // Atomic claim: the row is deleted as part of verification so a parallel
        // request with the same link cannot succeed twice.
        const record = await verificationTokenRepository.consume(hashedToken)
        if (!record) throw new BadRequestError('Token invalide ou expire')

        const user = await userRepository.findByEmail(record.identifier)
        if (!user) throw new NotFoundError('Utilisateur introuvable')

        return { user, hashedToken }
    }

    /**
     * Kept for API compatibility. `verifyEmailToken` already consumes the
     * token atomically; this is now a no-op.
     */
    async consumeToken(_hashedToken: string): Promise<void> {
        void _hashedToken
    }

    async markEmailVerified(userId: string): Promise<void> {
        const user = await userRepository.update(userId, { emailVerified: new Date() })
        if (!user) throw new NotFoundError('Utilisateur introuvable')
    }

    async resetPassword(rawToken: string, newPassword: string): Promise<User> {
        const { user, hashedToken } = await this.verifyEmailToken(rawToken)
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        const updated = await userRepository.update(user.id, { password: hashedPassword })
        if (!updated) throw new NotFoundError('Utilisateur introuvable')

        await this.consumeToken(hashedToken)
        return user
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex')
    }
}

export const authService = new AuthService()
