import { getServerSession } from "next-auth";

import { options } from "@/lib/auth/authOptions";
import { userService } from "@/services/user.service";
import { ApiResponse } from "@/utils/apiResponse";
import { withUser } from "@/middlewares/withAuth";
import { updateProfileSchema } from "@/validations";

export async function GET() {
    const session = await getServerSession(options);
    return Response.json(session?.user ?? null);
}

export const PATCH = withUser(async (req, _ctx, session) => {
    const body = updateProfileSchema.parse(await req.json());
    const updated = await userService.update(session.user.id, body);

    return ApiResponse.success({ name: updated.name, image: updated.image });
});

export const DELETE = withUser(async (req, _ctx, session) => {
    // For credential users, require password confirmation
    const body = await req.json().catch(() => ({}));
    if (typeof body.password === "string" && body.password.length > 0) {
        const valid = await userService.verifyPassword(session.user.email!, body.password);
        if (!valid) return ApiResponse.error("Incorrect password.", 400);
    }

    await userService.delete(session.user.id);

    return ApiResponse.success({ deleted: true });
});
