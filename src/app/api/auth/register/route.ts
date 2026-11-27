import { NextRequest } from "next/server"

import { userService } from "@/services/user.service"
import { pantryService } from "@/services/pantry.service"
import { authService } from "@/services/auth.service"
import { mailService } from "@/services/mail.service"
import { publicRegisterSchema, relativeCallbackUrlSchema } from "@/validations/auth.validation"
import { demoBarSchema } from "@/validations/demo-bar.validation"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"
import { validateCsrf } from "@/middlewares/csrf"
import { enforceCredentialPolicy } from "@/lib/auth/credentialPolicy"

const ACCEPTED = { message: "Check your inbox to verify your email." }

export const POST = withErrorHandler(async (req: NextRequest) => {
    validateCsrf(req)
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    await enforceCredentialPolicy(req, {
        channel: "web",
        action: "register",
        turnstileToken: body.turnstileToken,
        turnstileAction: "signup",
    })

    const data = publicRegisterSchema.parse(body)
    const callbackUrl = relativeCallbackUrlSchema.parse(body.callbackUrl ?? "/")
    const demoBar = demoBarSchema.optional().safeParse(body.demoBar)

    // Same response whether or not the email is already registered (SEC-008).
    const existing = await userService.findByEmail(data.email)
    if (existing) {
        await mailService.sendAccountExistsEmail(existing.email).catch((error: unknown) =>
            console.error("[Register] account-exists notice failed", error))
        return ApiResponse.created(ACCEPTED)
    }

    const user = await userService.create({
        email: data.email,
        name: data.name,
        password: data.password,
        role: "USER",
    })

    if (demoBar.success && demoBar.data?.length) {
        try {
            await pantryService.importDemoBar(user.id, demoBar.data)
        } catch (error) {
            console.error("[Register] demo bar import failed", error)
        }
    }

    const token = await authService.createEmailToken(user.email, "verify")
    await mailService.sendVerificationEmail(user.email, token, callbackUrl)

    return ApiResponse.created(ACCEPTED)
})
