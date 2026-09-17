import crypto from 'crypto'
import { encode, decode } from 'next-auth/jwt'
import type { User } from '@prisma/client'

import { refreshTokenRepository } from '@/repositories/refresh-token.repository'
import { env, requireEnv } from '@/lib/env'

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24       // 24 hours
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 180 // 180 days, extended on use

export type MobileTokenPayload = {
    sub: string
    id: string
    email: string | null
    name: string | null
    image: string | null
    role: string
    aud: 'mobile'
}

export class MobileAuthService {
    private secret() {
        return requireEnv('NEXTAUTH_SECRET', env.NEXTAUTH_SECRET)
    }

    async createAccessToken(user: Pick<User, 'id' | 'email' | 'name' | 'image' | 'role'>) {
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
                aud: 'mobile',
            },
        })
    }

    async createRefreshToken(userId: string, deviceId: string) {
        const raw = crypto.randomBytes(40).toString('hex')
        const hashed = this.hash(raw)
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000)

        await refreshTokenRepository.create(userId, hashed, deviceId, expiresAt)

        return raw
    }

    async rotateRefreshToken(rawToken: string, deviceId: string) {
        const hashed = this.hash(rawToken)
        const record = await refreshTokenRepository.findValid(hashed)

        if (!record) throw new Error('INVALID_REFRESH_TOKEN')

        await refreshTokenRepository.revoke(hashed)

        return this.createRefreshToken(record.userId, deviceId)
    }

    async renewRefreshToken(rawToken: string, deviceId: string) {
        const hashed = this.hash(rawToken)
        const record = await refreshTokenRepository.findValid(hashed)

        if (!record) throw new Error('INVALID_REFRESH_TOKEN')

        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000)
        const updated = await refreshTokenRepository.extendExpiry(hashed, deviceId, expiresAt)
        if (updated.count === 0) throw new Error('INVALID_REFRESH_TOKEN')

        return {
            refreshToken: rawToken,
            userId: record.userId,
        }
    }

    async revokeRefreshToken(rawToken: string) {
        const hashed = this.hash(rawToken)
        await refreshTokenRepository.revoke(hashed)
    }

    async revokeAllTokensForUser(userId: string) {
        await refreshTokenRepository.revokeAllForUser(userId)
    }

    async decodeAccessToken(token: string): Promise<MobileTokenPayload | null> {
        try {
            const payload = await decode({ secret: this.secret(), token })
            if (!payload || payload.aud !== 'mobile') return null
            return payload as MobileTokenPayload
        } catch {
            return null
        }
    }

    async getUserIdFromRefreshToken(rawToken: string): Promise<string | null> {
        const hashed = this.hash(rawToken)
        const record = await refreshTokenRepository.findValid(hashed)
        return record?.userId ?? null
    }

    private hash(value: string) {
        return crypto.createHash('sha256').update(value).digest('hex')
    }
}

export const mobileAuthService = new MobileAuthService()
