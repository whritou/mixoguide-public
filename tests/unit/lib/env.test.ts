import { describe, expect, it } from 'vitest'
import { buildEnvSchema, PRODUCTION_REQUIRED_ENV, shouldEnforceProductionEnv } from '@/lib/env'

const completeProdEnv = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://u:p@db:5432/app',
    NEXTAUTH_SECRET: 'x'.repeat(32),
    RESEND_API_KEY: 're_123',
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
    TRUSTED_PROXY: 'cloudflare',
}

describe('env production-required validation', () => {
    it('lists the production-required variables', () => {
        expect([...PRODUCTION_REQUIRED_ENV].sort()).toEqual(
            ['DATABASE_URL', 'NEXTAUTH_SECRET', 'RESEND_API_KEY', 'TRUSTED_PROXY', 'TURNSTILE_SECRET_KEY'],
        )
    })

    it('accepts a complete production environment', () => {
        expect(buildEnvSchema(true).safeParse(completeProdEnv).success).toBe(true)
    })

    it.each(PRODUCTION_REQUIRED_ENV)('fails with a clear message when %s is missing in production', (key) => {
        const result = buildEnvSchema(true).safeParse({ ...completeProdEnv, [key]: '' })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues).toContainEqual(expect.objectContaining({
                path: [key],
                message: `${key} is required in production`,
            }))
        }
    })

    it('does not require them outside production', () => {
        expect(buildEnvSchema(true).safeParse({ NODE_ENV: 'development' }).success).toBe(true)
    })

    it('does not require them when enforcement is off (build phase / tests)', () => {
        expect(buildEnvSchema(false).safeParse({ NODE_ENV: 'production' }).success).toBe(true)
    })
})

describe('shouldEnforceProductionEnv', () => {
    it('enforces at production runtime', () => {
        expect(shouldEnforceProductionEnv({ NODE_ENV: 'production' })).toBe(true)
    })

    it('skips during `next build`', () => {
        expect(shouldEnforceProductionEnv({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' })).toBe(false)
    })

    it('skips under vitest, with SKIP_ENV_VALIDATION=1, and outside production', () => {
        expect(shouldEnforceProductionEnv({ NODE_ENV: 'production', VITEST: 'true' })).toBe(false)
        expect(shouldEnforceProductionEnv({ NODE_ENV: 'production', SKIP_ENV_VALIDATION: '1' })).toBe(false)
        expect(shouldEnforceProductionEnv({ NODE_ENV: 'development' })).toBe(false)
        expect(shouldEnforceProductionEnv({ NODE_ENV: 'test' })).toBe(false)
    })
})
