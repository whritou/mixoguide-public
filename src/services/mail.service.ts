// src/services/mail.service.ts
import { sendVerificationEmail, sendResetPasswordEmail, sendCollectionInviteEmail, sendAccountExistsEmail } from "@/utils/mail"
import { env } from "@/lib/env"

const BASE_URL = env.NEXT_PUBLIC_BASE_URL

export class MailService {
    async sendVerificationEmail(email: string, token: string, callbackUrl = "/"): Promise<void> {
        const link = `${BASE_URL}/api/auth/verify-email?token=${token}&callbackUrl=${encodeURIComponent(callbackUrl)}`
        await sendVerificationEmail(email, link)
    }

    async sendResetPasswordEmail(email: string, token: string, opts: { source?: "mobile" } = {}): Promise<void> {
        const source = opts.source === "mobile" ? "&source=mobile" : ""
        const link = `${BASE_URL}/reset-password?token=${token}${source}`
        await sendResetPasswordEmail(email, link)
    }

    /** Sent instead of an error when someone registers with an existing email (SEC-008). */
    async sendAccountExistsEmail(email: string): Promise<void> {
        await sendAccountExistsEmail(email, `${BASE_URL}/signin`, `${BASE_URL}/request-reset-password`)
    }

    async sendCollectionInvite(params: {
        to:              string
        hostName:        string
        collectionTitle: string
        shareToken:      string
        plannedFor:      Date
        location?:       string | null
    }): Promise<void> {
        const inviteUrl = `${BASE_URL}/invite/${params.shareToken}`
        await sendCollectionInviteEmail({
            to:              params.to,
            hostName:        params.hostName,
            collectionTitle: params.collectionTitle,
            inviteUrl,
            plannedFor:      params.plannedFor,
            location:        params.location ?? null,
        })
    }
}

export const mailService = new MailService()
