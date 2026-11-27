import crypto from 'crypto'
import { encode, decode } from 'next-auth/jwt'
import type { User } from '@prisma/client'

import { refreshTokenRepository } from '@/repositories/refresh-token.repository'
import { prisma } from '@/lib/db/prisma'
import { env, requireEnv } from '@/lib/env'

// Short-lived access tokens: revocation (password change, deletion, demotion)
// takes effect within this window even without a DB check (SEC-004/SEC-019).
const ACCESS_TOKEN_MAX_AGE = 60 * 60              // 1 hour
// Refresh tokens rotate on every use; an unused token dies after 60 days.
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 60   // 60 days

export type MobileTokenPayload = {
    sub: string
    id: string
    email: string | null
    name: string | null
    image: string | null
    role: string
    sv: number
    aud: 'mobile'
}

type TokenUser = Pick<User, 'id' | 'email' | 'name' | 'image' | 'role'> & { sessionVersion?: number }

export class MobileAuthService {
    private secret() {
        return requireEnv('NEXTAUTH_SECRET', env.NEXTAUTH_SECRET)
    }

    async createAccessToken(user: TokenUser) {
        return encode({
            secret: this.secret(),
            maxAge: ACCESS_TOKEN_MAX_AGE,
            token: {
                sub: user.id,
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
                sv: user.sessionVersion ?? 0,
                aud: 'mobile',
            },
        })
    }

    async createRefreshToken(userId: string, deviceId: string) {
        const raw = crypto.randomBytes(40).toString('hex')
        await refreshTokenRepository.create(userId, this.hash(raw), deviceId, this.refreshExpiry())
        return raw
    }

    /**
     * Rotate a refresh token: the presented token is consumed and a new one is
     * returned. Presenting an already-used token is treated as theft and revokes
     * the user's whole token family (see RefreshTokenRepository.rotate).
     */
    async rotateRefreshToken(rawToken: string, deviceId: string): Promise<{ refreshToken: string; userId: string }> {
        const next = crypto.randomBytes(40).toString('hex')
        const result = await refreshTokenRepository.rotate(
            this.hash(rawToken), this.hash(next), deviceId, this.refreshExpiry(),
        )
        if (result.status !== 'rotated') throw new Error('INVALID_REFRESH_TOKEN')
        return { refreshToken: next, userId: result.userId }
    }

    async revokeRefreshToken(rawToken: string) {
        await refreshTokenRepository.revoke(this.hash(rawToken))
    }

    async revokeAllTokensForUser(userId: string) {
        await refreshTokenRepository.revokeAllForUser(userId)
    }

    /**
     * Decode a mobile access token and confirm it is still valid for the user:
     * the user must exist and its sessionVersion must match (password change,
     * reset or forced logout bump the version). Role comes from the database.
     */
    async decodeAccessToken(token: string): Promise<MobileTokenPayload | null> {
        let payload: Record<string, unknown> | null
        try {
            payload = await decode({ secret: this.secret(), token }) as Record<string, unknown> | null
        } catch {
            return null
        }
        if (!payload || payload.aud !== 'mobile' || typeof payload.id !== 'string') return null

        const current = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { role: true, sessionVersion: true },
        })
        if (!current) return null
        if ((typeof payload.sv === 'number' ? payload.sv : 0) !== current.sessionVersion) return null

        return { ...(payload as unknown as MobileTokenPayload), role: current.role }
    }

    private refreshExpiry() {
        return new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000)
    }

    private hash(value: string) {
        return crypto.createHash('sha256').update(value).digest('hex')
    }
}

export const mobileAuthService = new MobileAuthService()
