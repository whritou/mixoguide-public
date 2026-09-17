import { userService } from "@/services/user.service";
import { ApiResponse } from "@/utils/apiResponse";
import { withUser } from "@/middlewares/withAuth";

export const GET = withUser(async (_req, _ctx, session) => {
    const user = await userService.getWithStats(session.user.id);

    // A user "has a password" only if they have one stored AND they did NOT sign up
    // exclusively via an OAuth provider (Google etc.). If they have a linked OAuth
    // account they confirmed identity via the provider — no password needed.
    const linkedProviders = user.accounts.map((a) => a.provider);
    const hasPassword = user.password !== null && !linkedProviders.includes("google");

    return ApiResponse.success({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        hasPassword,
        linkedProviders,
        stats: user._count,
    });
});
