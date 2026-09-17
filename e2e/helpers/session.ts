import type { BrowserContext } from '@playwright/test'
import { encode } from 'next-auth/jwt'

type SessionRole = 'USER' | 'ADMIN'

type SessionFixture = {
    id: string
    email: string
    name: string
    role: SessionRole
    image?: string | null
}

const SESSION_COOKIE_NAMES = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
] as const

export async function setFixtureSession(context: BrowserContext, user: SessionFixture) {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
        throw new Error('NEXTAUTH_SECRET is required to set a fixture session')
    }

    const token = await encode({
        secret,
        maxAge: 60 * 60,
        token: {
            sub: user.id,
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image ?? null,
            accessTokenExpires: Date.now() + 60 * 60 * 1000,
        },
    })

    const expires = Math.floor(Date.now() / 1000) + 60 * 60
    await context.addCookies(
        SESSION_COOKIE_NAMES.map((name) => ({
            name,
            value: token,
            url: 'http://localhost:3000',
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            expires,
        })),
    )
}
