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

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password required"),
})

export const registerSchema = z.object({
    email: emailSchema,
    name: nameSchema,
    password: z.string().min(8, "Password must be at least 8 characters").max(100).optional(),
    role: z.enum(["ADMIN", "USER"]).optional(),
    image: z.string().url("Invalid image URL").optional().nullable(),
})

export const resetPasswordSchema = z
    .object({
        token: z.string().min(1, "Token required"),
        password: z.string().min(8, "Password must be at least 8 characters").max(100),
        passwordConfirm: z.string().min(8).max(100),
    })
    .refine((data) => data.password === data.passwordConfirm, {
        message: "Passwords do not match",
        path: ["passwordConfirm"],
    })

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
        confirmPassword: z.string().min(8).max(100),
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
