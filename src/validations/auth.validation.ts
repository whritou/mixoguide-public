import { z } from "zod"

export const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email")

export const nameSchema = z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .trim()

const CALLBACK_URL_BASE = "https://mixoguide.local"

export function normalizeRelativeCallbackUrl(value: unknown): string {
    if (typeof value !== "string" || value.length === 0) return "/"
    if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("\\\\")) return "/"

    try {
        const parsed = new URL(value, CALLBACK_URL_BASE)
        if (parsed.origin !== CALLBACK_URL_BASE) return "/"
        return `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
        return "/"
    }
}

export const relativeCallbackUrlSchema = z.preprocess(
    normalizeRelativeCallbackUrl,
    z.string().startsWith("/")
)

/**
 * bcrypt only uses the first 72 bytes of its input, so longer passwords would
 * silently be truncated. Limit by UTF-8 byte length, not characters (SEC-018).
 */
export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine((value) => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 bytes")

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password required").max(200),
})

// Public sign-up: must never accept role or other privileged User fields.
export const publicRegisterSchema = z.object({
    email: emailSchema,
    name: nameSchema,
    // Required: password-less self-registration let anyone squat an email address (SEC-008).
    password: passwordSchema,
})

export type PublicRegisterInput = z.infer<typeof publicRegisterSchema>

export const resetPasswordSchema = z
    .object({
        token: z.string().min(1, "Token required"),
        password: passwordSchema,
        passwordConfirm: z.string().min(8).max(200),
    })
    .refine((data) => data.password === data.passwordConfirm, {
        message: "Passwords do not match",
        path: ["passwordConfirm"],
    })

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: passwordSchema,
        confirmPassword: z.string().min(8).max(200),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    })

export const emailTokenSchema = z.object({
    email: emailSchema,
    callbackUrl: relativeCallbackUrlSchema,
})

export const verifyEmailQuerySchema = z.object({
    token: z.string().min(1, "Token required"),
    callbackUrl: relativeCallbackUrlSchema,
})
