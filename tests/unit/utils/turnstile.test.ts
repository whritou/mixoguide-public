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
            Response.json({ success: true, hostname: "mixoguide.com", action: "signin" })
        );
        vi.stubGlobal("fetch", fetchMock);

        const { verifyTurnstileToken } = await loadTurnstile({
            NODE_ENV: "production",
            TURNSTILE_SECRET_KEY: "\"secret-key\"",
            NEXT_PUBLIC_BASE_URL: "https://mixoguide.com",
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
    describe("hardening (SEC-016)", () => {
        const prodEnv = {
            NODE_ENV: "production",
            TURNSTILE_SECRET_KEY: "secret-key",
            NEXT_PUBLIC_BASE_URL: "https://mixoguide.com",
            NEXTAUTH_URL: "https://mixoguide.com",
        };

        it.each([[{}], [123], [null], ["x".repeat(2049)], ["   "]])("rejects malformed token %#", async (token) => {
            const fetchMock = vi.fn();
            vi.stubGlobal("fetch", fetchMock);
            const { verifyTurnstileToken } = await loadTurnstile(prodEnv);
            await expect(verifyTurnstileToken(token)).resolves.toBe(false);
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it("rejects a token issued for another hostname", async () => {
            vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, hostname: "evil.example" })));
            vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const { verifyTurnstileToken } = await loadTurnstile(prodEnv);
            await expect(verifyTurnstileToken("tok")).resolves.toBe(false);
        });

        it("accepts the www variant of the site hostname", async () => {
            vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, hostname: "www.mixoguide.com" })));
            const { verifyTurnstileToken } = await loadTurnstile(prodEnv);
            await expect(verifyTurnstileToken("tok")).resolves.toBe(true);
        });

        it("rejects a widget action mismatch", async () => {
            vi.stubGlobal("fetch", vi.fn(async () =>
                Response.json({ success: true, hostname: "mixoguide.com", action: "signup" })));
            vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const { verifyTurnstileToken } = await loadTurnstile(prodEnv);
            await expect(verifyTurnstileToken("tok", undefined, "signin")).resolves.toBe(false);
        });

        it("passes an abort signal so a hung siteverify fails closed", async () => {
            const fetchMock = vi.fn(async (_i: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) =>
                Response.json({ success: true, hostname: "mixoguide.com" }));
            vi.stubGlobal("fetch", fetchMock);
            const { verifyTurnstileToken } = await loadTurnstile(prodEnv);
            await verifyTurnstileToken("tok");
            expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
        });

        it("skips hostname checks for Cloudflare test secrets", async () => {
            vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, hostname: "example.com" })));
            const { verifyTurnstileToken } = await loadTurnstile({
                ...prodEnv,
                TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
            });
            await expect(verifyTurnstileToken("tok")).resolves.toBe(true);
        });
    });
});
