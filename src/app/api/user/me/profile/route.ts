import { userService } from "@/services/user.service";
import { ApiResponse } from "@/utils/apiResponse";
import { withUser } from "@/middlewares/withAuth";

export const GET = withUser(async (_req, _ctx, session) => {
    const user = await userService.getWithStats(session.user.id);

    const linkedProviders = user.accounts.map((a) => a.provider);

    return ApiResponse.success({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        hasPassword: user.hasPassword,
        linkedProviders,
        stats: user._count,
    });
});
