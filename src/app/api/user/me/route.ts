import { getServerSession } from "next-auth";

import { options } from "@/lib/auth/authOptions";
import { userService } from "@/services/user.service";
import { mobileAuthService } from "@/services/mobile-auth.service";
import { ApiResponse } from "@/utils/apiResponse";
import { withUser } from "@/middlewares/withAuth";
import { updateProfileSchema } from "@/validations";
import { ForbiddenError } from "@/utils/errors";

export async function GET() {
    const session = await getServerSession(options);
    return Response.json(session?.user ?? null);
}

export const PATCH = withUser(async (req, _ctx, session) => {
    const body = updateProfileSchema.parse(await req.json());
    const updated = await userService.update(session.user.id, body);

    return ApiResponse.success({ name: updated.name, image: updated.image });
});

/**
 * Permanently delete the signed-in account.
 * Credential users MUST re-confirm their password (SEC-011); OAuth-only users
 * confirm in the UI (typed "DELETE") since they have no password to re-enter.
 */
export const DELETE = withUser(async (req, _ctx, session) => {
    const body = (await req.json().catch(() => ({}))) as { password?: unknown };

    if (await userService.requiresPasswordConfirmation(session.user.id)) {
        const password = typeof body.password === "string" ? body.password : "";
        if (!password || !(await userService.verifyPasswordById(session.user.id, password))) {
            throw new ForbiddenError("Password confirmation required.");
        }
    }

    await mobileAuthService.revokeAllTokensForUser(session.user.id);
    await userService.delete(session.user.id);

    return ApiResponse.success({ deleted: true });
}, { rateLimit: "change-password" });
