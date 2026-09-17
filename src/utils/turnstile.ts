import { env } from "@/lib/env";

type TurnstileSiteverifyResponse = {
    success: boolean;
    "error-codes"?: string[];
    challenge_ts?: string;
    hostname?: string;
    action?: string;
    cdata?: string;
}

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

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
    const secret = cleanEnvValue(env.TURNSTILE_SECRET_KEY);
    const response = token.trim();

    if (!response) return false;

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
        const res = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body,
            }
        );

        const data = await res.json() as TurnstileSiteverifyResponse;

        if (data.success === true) return true;

        console.warn("[turnstile] Verification failed", {
            status: res.status,
            errorCodes: data["error-codes"] ?? [],
            hostname: data.hostname,
            action: data.action,
        });

        return false;
    } catch (error) {
        console.error("[turnstile] Verification request failed", {
            message: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
