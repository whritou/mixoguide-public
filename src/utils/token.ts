import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

export async function createEmailToken(email: string) {
    const token = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidate any pending tokens for this email so only the newest link is
    // usable. Mirrors AuthService.createEmailToken; without this, an attacker
    // who already intercepted an earlier link can race the new one.
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    await prisma.verificationToken.create({
        data: {
            identifier: email,
            token: hashedToken,
            expires,
        },
    });

    return token;
}