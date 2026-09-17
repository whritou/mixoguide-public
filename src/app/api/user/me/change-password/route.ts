import { changePasswordSchema } from "@/validations/auth.validation";
import { userService } from "@/services/user.service";
import { ApiResponse } from "@/utils/apiResponse";
import { withUser } from "@/middlewares/withAuth";

export const POST = withUser(async (req, _ctx, session) => {
    const body = changePasswordSchema.parse(await req.json());

    const valid = await userService.verifyPassword(session.user.email!, body.currentPassword);
    if (!valid) return ApiResponse.error("Current password is incorrect.", 400);

    await userService.update(session.user.id, { password: body.newPassword });

    return ApiResponse.success({ updated: true });
}, { rateLimit: "change-password" });
