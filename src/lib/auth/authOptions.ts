import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";
import { createEmailToken } from "@/utils/token";
import { sendVerificationEmail } from "@/utils/mail";
import { verifyTurnstileToken } from "@/utils/turnstile";
import { checkRateLimit, getIp } from "@/lib/rateLimit";
import { normalizeRelativeCallbackUrl } from "@/validations/auth.validation";
import { User } from "@prisma/client";
import { env } from "@/lib/env";

const ROLE_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export const options: AuthOptions = {
    adapter: PrismaAdapter(prisma),

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
                if (!credentials?.email || !credentials.password) return null;

                const ip = getIp(req?.headers ?? {});
                try {
                    await checkRateLimit("signin", ip);
                } catch {
                    throw new Error("RateLimited");
                }

                if (
                    !credentials.turnstileToken ||
                    !(await verifyTurnstileToken(credentials.turnstileToken, ip))
                ) {
                    throw new Error("CaptchaFailed");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) return null;

                const isValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isValid) return null;

                if (!user.emailVerified) {
                    const token = await createEmailToken(user.email);

                    const callbackUrl = normalizeRelativeCallbackUrl(req?.body?.callbackUrl);

                    const link =
                        `${env.NEXT_PUBLIC_BASE_URL}/api/auth/verify-email` +
                        `?token=${token}&callbackUrl=${encodeURIComponent(callbackUrl)}`;

                    await sendVerificationEmail(user.email, link);

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
                token.id = user.id;
                token.role = (user as User).role ?? "USER";
                token.image = (user as User).image;

                token.accessTokenExpires = Date.now() + ROLE_REFRESH_INTERVAL_MS;
                return token;
            }

            // Only hit DB when the short-lived role cache has expired.
            if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
                return token;
            }

            if (typeof token.id !== "string") {
                throw new Error("Session token missing user id");
            }

            const dbUser = await prisma.user.findUnique({
                where: { id: token.id },
                select: { role: true },
            });

            if (!dbUser) {
                throw new Error("Session user no longer exists");
            }

            token.role = dbUser.role ?? "USER";
            token.accessTokenExpires = Date.now() + ROLE_REFRESH_INTERVAL_MS;

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
