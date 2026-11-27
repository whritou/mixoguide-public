import type { BrowserContext } from '@playwright/test'
import { encode } from 'next-auth/jwt'

type FixtureUser = { id: string; email: string; name: string; role: 'USER' | 'ADMIN' }

// Chromium rejects a non-Secure __Secure- cookie, so only the plain-http cookie name is set here.
export async function setVisualSession(context: BrowserContext, user: FixtureUser) {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) throw new Error('NEXTAUTH_SECRET is required for logged-in visual baselines')

    const token = await encode({
        secret,
        maxAge: 60 * 60,
        token: {
            sub: user.id,
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: null,
            accessTokenExpires: Date.now() + 60 * 60 * 1000,
        },
    })

    await context.addCookies([
        {
            name: 'next-auth.session-token',
            value: token,
            url: 'http://localhost:3000',
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            expires: Math.floor(Date.now() / 1000) + 60 * 60,
        },
    ])
}
