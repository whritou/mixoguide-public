import { TooManyRequestsError } from "@/utils/errors"
import { getRedis } from "@/lib/redis"
import { env } from "@/lib/env"
import type { NextRequest } from "next/server"

// ─── Self-hosted Redis (production) ──────────────────────────────────────────
// When REDIS_PASSWORD is set, rate limits are stored in Redis and shared across
// all server instances. Falls back to in-memory when Redis is unavailable.
//
// Required env vars:
//   REDIS_PASSWORD   — Redis auth password
//   REDIS_USERNAME   — Redis auth username (default: "default")

type RateLimitConfig = {
    maxRequests: number
    windowSeconds: number
}

export const RATE_LIMIT_CONFIGS = {
    register:              { maxRequests: 5,   windowSeconds: 15 * 60 },
    signin:                { maxRequests: 10,  windowSeconds: 15 * 60 },
    "reset-password":      { maxRequests: 5,   windowSeconds: 15 * 60 },
    "resend-verification": { maxRequests: 5,   windowSeconds: 15 * 60 },
    "change-password":     { maxRequests: 5,   windowSeconds: 15 * 60 },
    upload:                { maxRequests: 20,  windowSeconds: 60 * 60 },
    rating:                { maxRequests: 20,  windowSeconds: 60 },
    suggestion:            { maxRequests: 5,   windowSeconds: 60 * 60 },
    "invite-email":        { maxRequests: 10,  windowSeconds: 60 * 60 },
    "pdf-export":          { maxRequests: 30,  windowSeconds: 60 * 60 },
    makeable:              { maxRequests: 30,  windowSeconds: 60 },
    recommendation:        { maxRequests: 10,  windowSeconds: 60 },
    "bulk-add":            { maxRequests: 10,  windowSeconds: 60 },
    "public-read":         { maxRequests: 60,  windowSeconds: 60 },
    "admin-write":         { maxRequests: 60,  windowSeconds: 60 },
} as const satisfies Record<string, RateLimitConfig>

export type RateLimitAction = keyof typeof RATE_LIMIT_CONFIGS

// ── In-memory fallback ────────────────────────────────────────────────────────
const memStore = new Map<string, { count: number; resetAt: number }>()

function memCheck(key: string, cfg: RateLimitConfig): boolean {
    const now = Date.now()
    const entry = memStore.get(key)

    if (!entry || now > entry.resetAt) {
        memStore.set(key, { count: 1, resetAt: now + cfg.windowSeconds * 1000 })
        return true
    }

    if (entry.count >= cfg.maxRequests) return false

    entry.count++
    return true
}

// Fixed-window counter via INCR + EXPIRE (atomic enough for auth rate limiting)
async function redisCheck(
    redis: import("ioredis").Redis,
    key: string,
    cfg: RateLimitConfig
): Promise<boolean> {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, cfg.windowSeconds)
    return count <= cfg.maxRequests
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkRateLimit(
    action: RateLimitAction,
    identifier: string  // IP for auth routes, userId for authenticated routes
): Promise<void> {
    if (process.env.DISABLE_RATE_LIMIT === "1") return

    const cfg = RATE_LIMIT_CONFIGS[action]
    const key = `rl:${action}:${identifier}`

    const redis = await getRedis()

    if (!redis && env.NODE_ENV !== "production") {
        console.warn(`[rateLimit] Redis unavailable -- using in-memory fallback for ${action}.`)
    }

    const allowed = redis
        ? await redisCheck(redis, key, cfg).catch(() => memCheck(key, cfg))
        : memCheck(key, cfg)

    if (!allowed) throw new TooManyRequestsError("Too many attempts. Please try again later.")
}

export async function rateLimit(
    action: RateLimitAction,
    req: NextRequest,
    session?: { user?: { id?: string | null } } | null
): Promise<void> {
    await checkRateLimit(action, session?.user?.id ?? getIp(req.headers))
}

function readHeader(
    headers: Headers | Record<string, string | string[] | undefined>,
    name: string,
): string | undefined {
    if (headers instanceof Headers) return headers.get(name) ?? undefined
    const value = headers[name]
    return Array.isArray(value) ? value[0] : value
}

const TRUSTED_PROXY_HEADER: Record<NonNullable<typeof env.TRUSTED_PROXY>, string> = {
    cloudflare: "cf-connecting-ip",
    "x-forwarded-for": "x-forwarded-for",
    "x-real-ip": "x-real-ip",
}

/**
 * Resolve the client IP from request headers.
 *
 * Only the header indicated by `TRUSTED_PROXY` is honoured. Without that env
 * var configured, forwarding headers are ignored entirely -- this prevents
 * attackers from spoofing arbitrary IPs in deployments that sit directly on
 * the public internet.
 */
export function getIp(headers: Headers | Record<string, string | string[] | undefined>): string {
    const trusted = env.TRUSTED_PROXY
    if (!trusted) return "unknown"

    const headerName = TRUSTED_PROXY_HEADER[trusted]
    const raw = readHeader(headers, headerName)
    if (!raw) return "unknown"

    // For x-forwarded-for, take the leftmost entry (the original client) when
    // a single trusted proxy sits in front of the app. Operators with chained
    // proxies must terminate forwarding at their trust boundary.
    const value = headerName === "x-forwarded-for"
        ? raw.split(",")[0]?.trim()
        : raw.trim()

    return value || "unknown"
}
