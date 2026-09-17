import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { options } from "@/lib/auth/authOptions";
import { mobileAuthService } from "@/services/mobile-auth.service";
import { prisma } from "@/lib/db/prisma";

/** Build a NextAuth-shaped session from a decoded mobile JWT. */
async function sessionFromBearerToken(token: string) {
    const payload = await mobileAuthService.decodeAccessToken(token);
    if (!payload) return null;

    return {
        user: {
            id: payload.id,
            email: payload.email,
            name: payload.name,
            image: payload.image,
            role: payload.role as "ADMIN" | "USER",
        },
        expires: new Date(Date.now() + 60 * 60 * 24 * 1000).toISOString(),
    };
}

export async function requireAdmin() {
    const headersList = await headers();
    const authorization = headersList.get("authorization");

    const session = authorization?.startsWith("Bearer ")
        ? await sessionFromBearerToken(authorization.slice(7))
        : await getServerSession(options);

    if (!session?.user?.id || session.user.role !== "ADMIN") return null;

    // Defense in depth: never trust the role embedded in a cached JWT for
    // admin-only routes. Re-verify the current role from the database so that
    // demotions take effect immediately rather than after the token expires.
    const current = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });
    if (current?.role !== "ADMIN") return null;

    return session;
}

export async function requireUser() {
    const headersList = await headers();
    const authorization = headersList.get("authorization");

    if (authorization?.startsWith("Bearer ")) {
        return sessionFromBearerToken(authorization.slice(7));
    }

    const session = await getServerSession(options);
    if (!session?.user) return null;
    return session;
}
