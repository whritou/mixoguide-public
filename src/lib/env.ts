import { z } from "zod"

const emptyToUndefined = (value: unknown) => value === "" ? undefined : value

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
)

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().url().optional(),
)

const urlWithDefault = (fallback: string) =>
  z.preprocess(emptyToUndefined, z.string().url().default(fallback))

const optionalEmailWithDefault = (fallback: string) =>
  z.preprocess(emptyToUndefined, z.string().email().default(fallback))

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Runtime DB connection (may be a pooler). DIRECT_URL is a direct connection used by
  // `prisma migrate deploy` in the release job (see docs/RUNBOOK.md).
  DATABASE_URL: optionalString,
  DIRECT_URL: optionalString,

  NEXTAUTH_SECRET: optionalString,
  NEXTAUTH_URL: optionalUrl,
  NEXT_PUBLIC_BASE_URL: urlWithDefault("https://mixoguide.com"),
  NEXT_PUBLIC_DARK_MODE: z.preprocess(
    emptyToUndefined,
    z.enum(["off", "preview", "on"]).default("on"),
  ),

  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,

  REDIS_HOST: z.preprocess(emptyToUndefined, z.string().default("localhost")),
  REDIS_PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(6379),
  ),
  REDIS_USERNAME: z.preprocess(emptyToUndefined, z.string().default("default")),
  REDIS_PASSWORD: optionalString,

  RESEND_API_KEY: optionalString,
  ADMIN_NOTIFICATION_EMAIL: optionalEmailWithDefault("suggestion@mixoguide.com"),

  TURNSTILE_SECRET_KEY: optionalString,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,

  ANDROID_CERT_SHA256_FINGERPRINTS: optionalString,

  // Trusted reverse-proxy configuration for client IP resolution.
  //   "cloudflare"     -- trust only cf-connecting-ip
  //   "x-forwarded-for"-- trust the leftmost x-forwarded-for entry (single hop)
  //   "x-real-ip"      -- trust x-real-ip (single hop)
  //   <unset>          -- no proxy; ignore forwarding headers (dev/test default)
  TRUSTED_PROXY: z.preprocess(
    emptyToUndefined,
    z.enum(["cloudflare", "x-forwarded-for", "x-real-ip"]).optional(),
  ),
})

/** Variables that must be present when the server runs with NODE_ENV=production. */
export const PRODUCTION_REQUIRED_ENV = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "RESEND_API_KEY",
  "TURNSTILE_SECRET_KEY",
  "TRUSTED_PROXY",
] as const

/**
 * Production-required checks are skipped during `next build` (which evaluates modules
 * with NODE_ENV=production but without runtime secrets), in tests, and in the browser
 * (server-only secrets are never inlined into client bundles).
 */
export function shouldEnforceProductionEnv(
  source: Record<string, string | undefined> = process.env,
): boolean {
  if (source.NODE_ENV !== "production") return false
  if (source.NEXT_PHASE === "phase-production-build") return false
  if (source.VITEST || source.SKIP_ENV_VALIDATION === "1") return false
  if (typeof window !== "undefined") return false
  return true
}

export function buildEnvSchema(enforceProduction: boolean) {
  return baseSchema.superRefine((e, ctx) => {
    if (!enforceProduction || e.NODE_ENV !== "production") return
    for (const key of PRODUCTION_REQUIRED_ENV) {
      if (!e[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required in production`,
        })
      }
    }
  })
}

const envSchema = buildEnvSchema(shouldEnforceProductionEnv())

// Next inlines NEXT_PUBLIC_* only for literal `process.env.NAME` references, so they must be named explicitly to be readable on the client.
const parsedEnv = envSchema.parse({
  ...process.env,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_DARK_MODE: process.env.NEXT_PUBLIC_DARK_MODE,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
})

export const env = {
  ...parsedEnv,
  NEXTAUTH_URL: parsedEnv.NEXTAUTH_URL ?? parsedEnv.NEXT_PUBLIC_BASE_URL,
}

export function isDarkModeAvailable(): boolean {
  return (
    env.NEXT_PUBLIC_DARK_MODE === "on" ||
    (env.NEXT_PUBLIC_DARK_MODE === "preview" && env.NODE_ENV !== "production")
  )
}

export type AppEnv = typeof env

export function requireEnv(name: keyof AppEnv, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}
