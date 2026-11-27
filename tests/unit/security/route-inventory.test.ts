import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * Static inventory of every API route. New routes must be classified, so an
 * unwrapped (unauthenticated, unthrottled) handler cannot slip in unnoticed.
 */
const API_ROOT = join(__dirname, '../../../src/app/api')

function routeFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) return routeFiles(full)
        return /^route\.tsx?$/.test(name) ? [full] : []
    })
}

const files = routeFiles(API_ROOT).map((file) => ({
    path: relative(API_ROOT, file).split(sep).join('/'),
    source: readFileSync(file, 'utf8'),
}))

const WRAPPERS = /=\s*with(User|Admin|Public|OptionalUser|ErrorHandler)\s*\(/
// Handlers allowed without a wrapper (framework- or infra-owned).
const UNWRAPPED_ALLOWED = new Set(['auth/[...nextauth]/route.ts'])

describe('API route inventory', () => {
    it('finds the route files', () => {
        expect(files.length).toBeGreaterThan(70)
    })

    it.each(files.map((f) => [f.path, f.source]))('%s: every handler is wrapped', (path, source) => {
        if (UNWRAPPED_ALLOWED.has(path) || path.startsWith('health/')) return
        const handlers = source.match(/export const (GET|POST|PUT|PATCH|DELETE)\s*=[^\n]*/g) ?? []
        for (const line of handlers) expect(line, `${path}: ${line}`).toMatch(WRAPPERS)
        expect(source).not.toMatch(/export (async )?function (GET|POST|PUT|PATCH|DELETE)\b(?![\s\S]*getServerSession)/)
    })

    it('every credential / account-creation endpoint uses the shared credential policy or a rate limit', () => {
        const credentialRoutes = files.filter((f) => f.path.startsWith('auth/') && f.path !== 'auth/[...nextauth]/route.ts')
        for (const f of credentialRoutes) {
            expect(f.source, f.path).toMatch(/enforceCredentialPolicy|checkRateLimit|rateLimit\(/)
        }
        for (const path of ['auth/register/route.ts', 'auth/mobile/register/route.ts', 'auth/mobile/login/route.ts']) {
            expect(files.find((f) => f.path === path)?.source, path).toContain('enforceCredentialPolicy')
        }
    })

    it('the captcha-less legacy web login endpoint stays deleted (SEC-005)', () => {
        expect(files.some((f) => f.path === 'auth/login/route.ts')).toBe(false)
    })

    it('no route returns full user rows through a raw include', () => {
        for (const f of files) expect(f.source, f.path).not.toMatch(/include:\s*\{\s*user:\s*true/)
    })
})
