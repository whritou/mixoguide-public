import type { NextRequest } from "next/server";

import { checkRateLimit, getIp, type RateLimitAction } from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/utils/turnstile";
import { ForbiddenError } from "@/utils/errors";

/**
 * One policy for every endpoint that accepts credentials or creates accounts
 * (SEC-005). Web and mobile endpoints previously drifted apart: the web sign-in
 * required Turnstile while the mobile twins did not, so bots simply used those.
 *
 * - Per-IP rate limit (`action`).
 * - Per-account rate limit when an email is known (credential stuffing spread
 *   across many IPs still hits the same account bucket).
 * - Proof of humanity: a Turnstile token from the body (`turnstileToken`) or the
 *   `x-turnstile-token` header. For the mobile channel this is enforced only when
 *   MOBILE_CAPTCHA_REQUIRED=1, because the currently shipped mobile app cannot
 *   produce a token yet; turn it on once a mobile build that sends the header is
 *   live. Until then mobile endpoints rely on the tighter rate limits above.
 */
export type CredentialChannel = "web" | "mobile";

export interface CredentialPolicyOptions {
    channel: CredentialChannel;
    action: RateLimitAction;
    email?: string;
    turnstileToken?: unknown;
    /** Expected Turnstile widget action ("signin", "signup", …). */
    turnstileAction?: string;
}

export function mobileCaptchaRequired(): boolean {
    return process.env.MOBILE_CAPTCHA_REQUIRED === "1";
}

export async function enforceCredentialPolicy(req: NextRequest | { headers: Headers }, opts: CredentialPolicyOptions): Promise<void> {
    const ip = getIp(req.headers);
    await checkRateLimit(opts.action, ip);

    if (opts.email) {
        await checkRateLimit("signin-account", opts.email.trim().toLowerCase());
    }

    const captchaRequired = opts.channel === "web" || mobileCaptchaRequired();
    if (!captchaRequired) return;

    const token = opts.turnstileToken ?? req.headers.get("x-turnstile-token");
    if (!(await verifyTurnstileToken(token, ip, opts.turnstileAction))) {
        throw new ForbiddenError("Captcha verification failed. Please try again.");
    }
}
