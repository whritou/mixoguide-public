import { changePasswordSchema } from "@/validations/auth.validation";
import { userService } from "@/services/user.service";
import { authService } from "@/services/auth.service";
import { ApiResponse } from "@/utils/apiResponse";
import { withUser } from "@/middlewares/withAuth";

export const POST = withUser(async (req, _ctx, session) => {
    const body = changePasswordSchema.parse(await req.json());

    const valid = await userService.verifyPasswordById(session.user.id, body.currentPassword);
    if (!valid) return ApiResponse.error("Current password is incorrect.", 400);

    // Updates the hash, bumps sessionVersion and revokes refresh tokens so every
    // other session (web JWTs, mobile apps) is signed out (SEC-004).
    await authService.setPasswordAndRevokeSessions(session.user.id, body.newPassword);

    return ApiResponse.success({ updated: true, reauthenticate: true });
}, { rateLimit: "change-password" });
