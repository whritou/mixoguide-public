import crypto from 'crypto'
import type { Prisma, User } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import { env, requireEnv } from '@/lib/env'
import { ConflictError, UnauthorizedError } from '@/utils/errors'

type GoogleTokenResponse = {
    access_token?: string
    expires_in?: number
    id_token?: string
    scope?: string
    token_type?: string
    error?: string
    error_description?: string
}

type GoogleProfile = {
    sub?: string
    email?: string
    email_verified?: boolean | string
    name?: string
    picture?: string
}

export type VerifiedGoogleProfile = {
    sub: string
    email: string
    emailVerified: boolean
    name?: string
    picture?: string
}

type GoogleJwtHeader = {
    alg?: string
    kid?: string
    typ?: string
}

type GoogleIdTokenPayload = {
    iss?: string
    aud?: string | string[]
    exp?: number
    iat?: number
    sub?: string
    email?: string
    email_verified?: boolean | string
    name?: string
    picture?: string
    nonce?: string
}

type GoogleJwk = crypto.JsonWebKey & {
    kid?: string
    alg?: string
    use?: string
}

type GoogleJwkSet = {
    keys?: GoogleJwk[]
}

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const GOOGLE_ID_TOKEN_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])
const GOOGLE_ID_TOKEN_CLOCK_SKEW_SECONDS = 60

let googleJwkCache: { keys: GoogleJwk[]; expiresAt: number } | null = null

function parseJwtSegment<T>(segment: string): T {
    try {
        const parsed = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Invalid JWT segment')
        }

        return parsed as T
    } catch {
        throw new UnauthorizedError('Invalid Google ID token')
    }
}

function cacheMaxAgeMs(headers: Headers) {
    const cacheControl = headers.get('cache-control')
    const maxAge = cacheControl?.match(/max-age=(\d+)/i)?.[1]
    if (!maxAge) return 60 * 60 * 1000
    return Math.max(60, Number(maxAge)) * 1000
}

async function fetchGoogleJwks(forceRefresh = false) {
    const now = Date.now()
    if (!forceRefresh && googleJwkCache && googleJwkCache.expiresAt > now) {
        return googleJwkCache.keys
    }

    const response = await fetch(GOOGLE_JWKS_URL, { signal: AbortSignal.timeout(4000) })
    let jwks: GoogleJwkSet
    try {
        jwks = await response.json() as GoogleJwkSet
    } catch {
        throw new UnauthorizedError('Could not verify Google ID token')
    }

    if (!response.ok || !Array.isArray(jwks.keys)) {
        throw new UnauthorizedError('Could not verify Google ID token')
    }

    googleJwkCache = {
        keys: jwks.keys,
        expiresAt: now + cacheMaxAgeMs(response.headers),
    }

    return googleJwkCache.keys
}

async function findGoogleJwk(kid: string) {
    const cached = await fetchGoogleJwks()
    const key = cached.find((item) => item.kid === kid)
    if (key) return key

    const refreshed = await fetchGoogleJwks(true)
    return refreshed.find((item) => item.kid === kid) ?? null
}

async function verifyGoogleIdTokenSignature(
    signingInput: string,
    signature: string,
    header: GoogleJwtHeader
) {
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
        throw new UnauthorizedError('Invalid Google ID token')
    }

    const jwk = await findGoogleJwk(header.kid)
    if (!jwk || jwk.kty !== 'RSA') {
        throw new UnauthorizedError('Invalid Google ID token')
    }

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(signingInput)
    verifier.end()

    if (!verifier.verify(publicKey, Buffer.from(signature, 'base64url'))) {
        throw new UnauthorizedError('Invalid Google ID token')
    }
}

function emailVerified(value: unknown) {
    return value === true || value === 'true'
}

function normalizeGoogleProfile(profile: GoogleProfile): VerifiedGoogleProfile {
    if (!profile.sub || !profile.email || !emailVerified(profile.email_verified)) {
        throw new UnauthorizedError('Google account email is not verified')
    }

    return {
        sub: profile.sub,
        email: profile.email.trim().toLowerCase(),
        emailVerified: true,
        name: profile.name,
        picture: profile.picture,
    }
}

// ─── Replay protection ───────────────────────────────────────────────────────
// A Google ID token stays valid for ~1 h. Each one may be exchanged for a
// MixoGuide session exactly once (SEC-003).
const consumedIdTokens = new Map<string, number>()

async function markIdTokenConsumed(idToken: string, expSeconds: number): Promise<boolean> {
    const key = `gid:${crypto.createHash('sha256').update(idToken).digest('hex')}`
    const ttl = Math.max(60, expSeconds - Math.floor(Date.now() / 1000) + GOOGLE_ID_TOKEN_CLOCK_SKEW_SECONDS)

    const { getRedis } = await import('@/lib/redis')
    const redis = await getRedis()
    if (redis) {
        const ok = await redis.set(key, '1', 'EX', ttl, 'NX').catch(() => null)
        if (ok !== null) return ok === 'OK'
    }

    const now = Date.now()
    for (const [k, until] of consumedIdTokens) if (until < now) consumedIdTokens.delete(k)
    if (consumedIdTokens.has(key)) return false
    consumedIdTokens.set(key, now + ttl * 1000)
    return true
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
    const parts = idToken.split('.')
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
        throw new UnauthorizedError('Invalid Google ID token')
    }

    const [encodedHeader, encodedPayload, signature] = parts
    const header = parseJwtSegment<GoogleJwtHeader>(encodedHeader)
    const payload = parseJwtSegment<GoogleIdTokenPayload>(encodedPayload)

    await verifyGoogleIdTokenSignature(`${encodedHeader}.${encodedPayload}`, signature, header)

    const clientId = requireEnv('AUTH_GOOGLE_ID', env.AUTH_GOOGLE_ID)
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    const now = Math.floor(Date.now() / 1000)

    if (!payload.iss || !GOOGLE_ID_TOKEN_ISSUERS.has(payload.iss)) {
        throw new UnauthorizedError('Invalid Google ID token issuer')
    }
    if (!audiences.includes(clientId)) {
        throw new UnauthorizedError('Invalid Google ID token audience')
    }
    if (typeof payload.exp !== 'number' || payload.exp < now - GOOGLE_ID_TOKEN_CLOCK_SKEW_SECONDS) {
        throw new UnauthorizedError('Expired Google ID token')
    }
    if (typeof payload.iat === 'number' && payload.iat > now + GOOGLE_ID_TOKEN_CLOCK_SKEW_SECONDS) {
        throw new UnauthorizedError('Invalid Google ID token')
    }

    if (!(await markIdTokenConsumed(idToken, payload.exp))) {
        throw new UnauthorizedError('Google ID token already used')
    }

    return normalizeGoogleProfile({
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified,
        name: payload.name,
        picture: payload.picture,
    })
}

/**
 * Account row for a Google identity. Provider tokens are deliberately NOT
 * persisted: the app never calls Google APIs on the user's behalf, and a stored
 * ID token is a replayable login credential (SEC-003).
 */
function googleAccountData(_tokenData: GoogleTokenResponse, profile: Pick<VerifiedGoogleProfile, 'sub'>) {
    void _tokenData
    const data: Prisma.AccountUncheckedCreateWithoutUserInput = {
        type: 'oauth',
        provider: 'google',
        providerAccountId: profile.sub,
    }
    return data
}

// Google serves user avatars from these CDN hosts only. Anything else is
// rejected to prevent SSRF, javascript:/data: URI injection, or attacker
// substitution of the profile.picture field on a compromised Google account.
const ALLOWED_AVATAR_HOSTS = new Set([
    'lh3.googleusercontent.com',
    'lh4.googleusercontent.com',
    'lh5.googleusercontent.com',
    'lh6.googleusercontent.com',
])

function safeAvatarUrl(value: string | undefined): string | null {
    if (!value) return null
    try {
        const url = new URL(value)
        if (url.protocol !== 'https:') return null
        if (!ALLOWED_AVATAR_HOSTS.has(url.hostname)) return null
        return url.toString()
    } catch {
        return null
    }
}

async function updateLinkedGoogleUser(user: User, profile: VerifiedGoogleProfile) {
    const data: Prisma.UserUpdateInput = {}
    const picture = safeAvatarUrl(profile.picture)

    if (!user.name && profile.name) data.name = profile.name
    if (!user.image && picture) data.image = picture
    if (!user.emailVerified) data.emailVerified = new Date()

    if (Object.keys(data).length === 0) return user

    return prisma.user.update({
        where: { id: user.id },
        data,
    })
}

export async function getOrCreateGoogleUserFromVerifiedProfile(
    profile: VerifiedGoogleProfile,
    tokenData: GoogleTokenResponse = {}
) {
    const account = await prisma.account.findUnique({
        where: {
            provider_providerAccountId: {
                provider: 'google',
                providerAccountId: profile.sub,
            },
        },
        include: { user: true },
    })

    if (account) {
        const data = googleAccountData(tokenData, profile)

        await prisma.account.update({
            where: {
                provider_providerAccountId: {
                    provider: 'google',
                    providerAccountId: profile.sub,
                },
            },
            data,
        })

        return updateLinkedGoogleUser(account.user, profile)
    }

    const existingUser = await prisma.user.findUnique({ where: { email: profile.email } })
    if (existingUser) {
        throw new ConflictError('This email is already registered with another provider.')
    }

    return prisma.user.create({
        data: {
            email: profile.email,
            name: profile.name ?? null,
            image: safeAvatarUrl(profile.picture),
            emailVerified: new Date(),
            role: 'USER',
            accounts: {
                create: googleAccountData(tokenData, profile),
            },
        },
    })
}
