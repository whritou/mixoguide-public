import type { AuthOptions } from "next-auth";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/lib/db/prisma";
import { authService } from "@/services/auth.service";
import { mailService } from "@/services/mail.service";
import { userService } from "@/services/user.service";
import { verifyTurnstileToken } from "@/utils/turnstile";
import { checkRateLimit, getIp } from "@/lib/rateLimit";
import { loginSchema, normalizeRelativeCallbackUrl } from "@/validations/auth.validation";
import { User } from "@prisma/client";
import { env } from "@/lib/env";

/** How often a JWT session re-reads role and sessionVersion from the database. */
const SESSION_RECHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Prisma adapter that never persists OAuth provider tokens. The app does not
 * call Google APIs on the user's behalf, so storing access/refresh/id tokens
 * only creates replayable credentials (SEC-003).
 */
function tokenlessPrismaAdapter(): Adapter {
    const base = PrismaAdapter(prisma) as Adapter;
    const linkAccount = base.linkAccount as ((account: AdapterAccount) => Promise<void>) | undefined;
    return {
        ...base,
        linkAccount: async (account: AdapterAccount) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { access_token, refresh_token, id_token, ...safe } = account;
            await linkAccount?.(safe as AdapterAccount);
        },
    } as Adapter;
}

export const options: AuthOptions = {
    adapter: tokenlessPrismaAdapter(),

    providers: [
        GoogleProvider({
            clientId: env.AUTH_GOOGLE_ID ?? "",
            clientSecret: env.AUTH_GOOGLE_SECRET ?? "",
        }),

        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                turnstileToken: { label: "Turnstile Token", type: "text" },
            },

            async authorize(credentials, req) {
                const parsed = loginSchema.safeParse(credentials ?? {});
                if (!parsed.success) return null;
                const { email, password } = parsed.data;

                const ip = getIp(req?.headers ?? {});
                try {
                    await checkRateLimit("signin", ip);
                    await checkRateLimit("signin-account", email);
                } catch {
                    throw new Error("RateLimited");
                }

                if (!(await verifyTurnstileToken(credentials?.turnstileToken, ip, "signin"))) {
                    throw new Error("CaptchaFailed");
                }

                // Constant-work check (always runs bcrypt) on the normalised email.
                const user = await userService.verifyPassword(email, password);
                if (!user) return null;

                if (!user.emailVerified) {
                    const token = await authService.createEmailToken(user.email, "verify");
                    const callbackUrl = normalizeRelativeCallbackUrl(req?.body?.callbackUrl);
                    await mailService.sendVerificationEmail(user.email, token, callbackUrl);

                    throw new Error("EmailNotVerified");
                }

                return user;
            },
        }),
    ],

    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 24 * 30,
    },

    jwt: {
        maxAge: 60 * 60 * 24 * 30,
    },

    callbacks: {
        async redirect({ url, baseUrl }) {
            try {
                const base = new URL(baseUrl);
                const parsed = new URL(url, baseUrl);
                if (parsed.origin === base.origin) return parsed.href;
            } catch {
                // Fall through to the safe default.
            }

            return baseUrl;
        },

        async jwt({ token, user }) {
            if (user) {
                const dbUser = user as User;
                token.id = dbUser.id;
                token.role = dbUser.role ?? "USER";
                token.image = dbUser.image;
                token.sv = dbUser.sessionVersion ?? 0;

                token.accessTokenExpires = Date.now() + SESSION_RECHECK_INTERVAL_MS;
                return token;
            }

            // Only hit DB when the short-lived cache has expired.
            if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
                return token;
            }

            if (typeof token.id !== "string") {
                throw new Error("Session token missing user id");
            }

            const dbUser = await prisma.user.findUnique({
                where: { id: token.id },
                select: { role: true, sessionVersion: true },
            });

            if (!dbUser) {
                throw new Error("Session user no longer exists");
            }

            // Password change/reset or forced logout bumps sessionVersion (SEC-004).
            const tokenVersion = typeof token.sv === "number" ? token.sv : 0;
            if (tokenVersion !== dbUser.sessionVersion) {
                throw new Error("Session revoked");
            }

            token.role = dbUser.role ?? "USER";
            token.accessTokenExpires = Date.now() + SESSION_RECHECK_INTERVAL_MS;

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "ADMIN" | "USER";
                session.user.image =
                    (session.user.image || token.image || null) as string | null;
            }

            return session;
        },
    },
};
