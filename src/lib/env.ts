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

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  NEXTAUTH_SECRET: optionalString,
  NEXTAUTH_URL: optionalUrl,
  NEXT_PUBLIC_BASE_URL: urlWithDefault("https://mixoguide.com"),

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

const parsedEnv = envSchema.parse(process.env)

export const env = {
  ...parsedEnv,
  NEXTAUTH_URL: parsedEnv.NEXTAUTH_URL ?? parsedEnv.NEXT_PUBLIC_BASE_URL,
}

export type AppEnv = typeof env

export function requireEnv(name: keyof AppEnv, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}
