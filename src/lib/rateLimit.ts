import { TooManyRequestsError } from "@/utils/errors"
import { getRedis } from "@/lib/redis"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"
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
    "makeable-preview":    { maxRequests: 120, windowSeconds: 10 * 60 },
    recommendation:        { maxRequests: 10,  windowSeconds: 60 },
    "bulk-add":            { maxRequests: 10,  windowSeconds: 60 },
    "public-read":         { maxRequests: 60,  windowSeconds: 60 },
    "admin-write":         { maxRequests: 60,  windowSeconds: 60 },
    "signin-account":      { maxRequests: 10,  windowSeconds: 15 * 60 }, // keyed by lowercased email
    "mobile-register":     { maxRequests: 3,   windowSeconds: 60 * 60 },
    barcode:               { maxRequests: 60,  windowSeconds: 60 * 60 },
    rsvp:                  { maxRequests: 10,  windowSeconds: 60 * 60 },
    device:                { maxRequests: 20,  windowSeconds: 60 * 60 },
    "token-refresh":       { maxRequests: 30,  windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitConfig>

export type RateLimitAction = keyof typeof RATE_LIMIT_CONFIGS

// ── In-memory fallback ────────────────────────────────────────────────────────
// Per-instance only (not shared across replicas). Bounded: expired entries are
// swept periodically and the map is capped at MEM_STORE_MAX_ENTRIES, evicting
// the oldest-inserted keys first (Map preserves insertion order).
export const MEM_STORE_MAX_ENTRIES = 10_000
const MEM_SWEEP_INTERVAL_MS = 60_000

const memStore = new Map<string, { count: number; resetAt: number }>()
let lastSweepAt = 0

function sweepExpired(now: number): void {
    for (const [key, entry] of memStore) {
        if (now > entry.resetAt) memStore.delete(key)
    }
    lastSweepAt = now
}

function memCheck(key: string, cfg: RateLimitConfig): boolean {
    const now = Date.now()
    if (now - lastSweepAt >= MEM_SWEEP_INTERVAL_MS) sweepExpired(now)

    const entry = memStore.get(key)

    if (!entry || now > entry.resetAt) {
        if (entry) memStore.delete(key) // re-insert at the end (newest)
        if (memStore.size >= MEM_STORE_MAX_ENTRIES) {
            sweepExpired(now)
            while (memStore.size >= MEM_STORE_MAX_ENTRIES) {
                const oldest = memStore.keys().next().value
                if (oldest === undefined) break
                memStore.delete(oldest)
            }
        }
        memStore.set(key, { count: 1, resetAt: now + cfg.windowSeconds * 1000 })
        return true
    }

    if (entry.count >= cfg.maxRequests) return false

    entry.count++
    return true
}

/** Test/diagnostic helpers for the in-memory store. */
export function __memStoreSize(): number {
    return memStore.size
}

export function __resetMemStore(): void {
    memStore.clear()
    lastSweepAt = 0
    lastFallbackLogAt = 0
}

// Log the fallback in every environment, but at most once per minute per instance.
const FALLBACK_LOG_INTERVAL_MS = 60_000
let lastFallbackLogAt = 0

function logFallback(action: RateLimitAction, reason: string): void {
    const now = Date.now()
    if (now - lastFallbackLogAt < FALLBACK_LOG_INTERVAL_MS) return
    lastFallbackLogAt = now
    logger.warn("rateLimit.memory_fallback", {
        action,
        reason,
        memStoreSize: memStore.size,
        note: "rate limits are per-instance until Redis is reachable",
    })
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

    if (!redis) logFallback(action, env.REDIS_PASSWORD ? "redis_unavailable" : "redis_not_configured")

    const allowed = redis
        ? await redisCheck(redis, key, cfg).catch((err: unknown) => {
            logFallback(action, err instanceof Error ? err.message : "redis_command_failed")
            return memCheck(key, cfg)
        })
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
