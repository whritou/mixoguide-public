import { env } from "@/lib/env";

type TurnstileSiteverifyResponse = {
    success: boolean;
    "error-codes"?: string[];
    challenge_ts?: string;
    hostname?: string;
    action?: string;
    cdata?: string;
}

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 3000;
/** Cloudflare documents 2048 characters as the maximum token length. */
const MAX_TOKEN_LENGTH = 2048;

function cleanEnvValue(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;

    if (
        (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1).trim() || undefined;
    }

    return trimmed;
}

function cleanRemoteIp(remoteIp: string | undefined): string | undefined {
    const trimmed = remoteIp?.trim();
    if (!trimmed || trimmed === "unknown") return undefined;
    return trimmed;
}

/** Cloudflare's public testing secrets (always pass / always fail / token spent). */
function isTestSecret(secret: string): boolean {
    return /^[123]x0{20,}/.test(secret);
}

/** Hostnames a token may have been issued for: the configured site URLs (and localhost outside production). */
function allowedHostnames(): Set<string> {
    const hosts = new Set<string>();
    for (const url of [env.NEXT_PUBLIC_BASE_URL, env.NEXTAUTH_URL]) {
        try {
            const host = new URL(url).hostname;
            hosts.add(host);
            if (host.startsWith("www.")) hosts.add(host.slice(4));
            else hosts.add(`www.${host}`);
        } catch {
            // ignore malformed URL; env validation reports it
        }
    }
    if (env.NODE_ENV !== "production") hosts.add("localhost");
    return hosts;
}

/**
 * Verify a Turnstile token with Cloudflare (server-side validation).
 *
 * Fails closed on: non-string or oversized input, missing secret in production,
 * Cloudflare errors or timeouts (3 s), hostname not belonging to this site, and
 * — when `expectedAction` is given — a widget action mismatch (SEC-016).
 */
export async function verifyTurnstileToken(
    token: unknown,
    remoteIp?: string,
    expectedAction?: string,
): Promise<boolean> {
    if (typeof token !== "string") return false;
    const response = token.trim();
    if (!response || response.length > MAX_TOKEN_LENGTH) return false;

    const secret = cleanEnvValue(env.TURNSTILE_SECRET_KEY);

    if (!secret) {
        if (env.NODE_ENV === "production") {
            console.error("[turnstile] TURNSTILE_SECRET_KEY is not configured; rejecting captcha verification.");
            return false;
        }

        console.warn("[turnstile] TURNSTILE_SECRET_KEY is not set - skipping verification outside production.");
        return true;
    }

    const body = new URLSearchParams({ secret, response });
    const verifiedRemoteIp = cleanRemoteIp(remoteIp);
    if (verifiedRemoteIp) body.set("remoteip", verifiedRemoteIp);

    try {
        const res = await fetch(SITEVERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
            signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
        });

        const data = await res.json() as TurnstileSiteverifyResponse;

        if (data.success !== true) {
            console.warn("[turnstile] Verification failed", {
                status: res.status,
                errorCodes: data["error-codes"] ?? [],
                hostname: data.hostname,
                action: data.action,
            });
            return false;
        }

        // Test secrets return placeholder hostname/action values.
        if (isTestSecret(secret)) return true;

        if (!data.hostname || !allowedHostnames().has(data.hostname)) {
            console.warn("[turnstile] Token issued for an unexpected hostname", { hostname: data.hostname });
            return false;
        }

        if (expectedAction && data.action !== expectedAction) {
            console.warn("[turnstile] Token action mismatch", { expected: expectedAction, action: data.action });
            return false;
        }

        return true;
    } catch (error) {
        console.error("[turnstile] Verification request failed", {
            message: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
