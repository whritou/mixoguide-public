import { afterEach, describe, expect, it, vi } from "vitest";

async function loadTurnstile(env: Record<string, string | undefined>) {
    vi.resetModules();

    for (const [key, value] of Object.entries(env)) {
        if (value === undefined) vi.stubEnv(key, "");
        else vi.stubEnv(key, value);
    }

    return import("@/utils/turnstile");
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("verifyTurnstileToken", () => {
    it("posts the token, normalized secret, and remote IP to Cloudflare", async () => {
        const fetchMock = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) =>
            Response.json({ success: true })
        );
        vi.stubGlobal("fetch", fetchMock);

        const { verifyTurnstileToken } = await loadTurnstile({
            NODE_ENV: "production",
            TURNSTILE_SECRET_KEY: "\"secret-key\"",
        });

        await expect(verifyTurnstileToken(" token-value ", "203.0.113.10")).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledWith(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            expect.objectContaining({
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            })
        );

        const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
        expect(body.get("secret")).toBe("secret-key");
        expect(body.get("response")).toBe("token-value");
        expect(body.get("remoteip")).toBe("203.0.113.10");
    });

    it("rejects production verification when the secret is missing", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const { verifyTurnstileToken } = await loadTurnstile({
            NODE_ENV: "production",
            TURNSTILE_SECRET_KEY: undefined,
        });

        await expect(verifyTurnstileToken("token-value")).resolves.toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("skips verification outside production when the secret is missing", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        vi.spyOn(console, "warn").mockImplementation(() => undefined);

        const { verifyTurnstileToken } = await loadTurnstile({
            NODE_ENV: "development",
            TURNSTILE_SECRET_KEY: undefined,
        });

        await expect(verifyTurnstileToken("token-value")).resolves.toBe(true);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("logs Cloudflare failure codes and returns false", async () => {
        const fetchMock = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) =>
            Response.json({
                success: false,
                "error-codes": ["invalid-input-secret"],
                hostname: "mixoguide.com",
            })
        );
        vi.stubGlobal("fetch", fetchMock);
        const warnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        const { verifyTurnstileToken } = await loadTurnstile({
            NODE_ENV: "production",
            TURNSTILE_SECRET_KEY: "secret-key",
        });

        await expect(verifyTurnstileToken("token-value")).resolves.toBe(false);
        expect(warnMock).toHaveBeenCalledWith(
            "[turnstile] Verification failed",
            expect.objectContaining({
                errorCodes: ["invalid-input-secret"],
                hostname: "mixoguide.com",
            })
        );
    });

    it("returns false when the siteverify request fails", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => {
            throw new Error("network down");
        }));
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const { verifyTurnstileToken } = await loadTurnstile({
            NODE_ENV: "production",
            TURNSTILE_SECRET_KEY: "secret-key",
        });

        await expect(verifyTurnstileToken("token-value")).resolves.toBe(false);
    });
});
