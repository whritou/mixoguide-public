import { describe, expect, it } from 'vitest'

import {
    emailTokenSchema,
    normalizeRelativeCallbackUrl,
    relativeCallbackUrlSchema,
} from '@/validations/auth.validation'

describe('auth callback URL validation', () => {
    it.each([
        ['/dashboard', '/dashboard'],
        ['/verify-email?next=%2Fpantry#top', '/verify-email?next=%2Fpantry#top'],
        ['', '/'],
        [null, '/'],
        ['dashboard', '/'],
        ['https://evil.example/phish', '/'],
        ['//evil.example/phish', '/'],
        ['\\\\evil.example\\phish', '/'],
    ])('normalizes %p to %p', (input, expected) => {
        expect(normalizeRelativeCallbackUrl(input)).toBe(expected)
    })

    it('sanitizes protocol-relative callback URLs through the Zod schema', () => {
        expect(relativeCallbackUrlSchema.parse('//evil.example')).toBe('/')
    })

    it('normalizes email token payloads without preserving unsafe callback URLs', () => {
        const result = emailTokenSchema.parse({
            email:       '  USER@Example.COM ',
            callbackUrl: 'https://evil.example/capture',
        })

        expect(result).toEqual({
            email:       'user@example.com',
            callbackUrl: '/',
        })
    })
})
