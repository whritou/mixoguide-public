import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = env.NEXT_PUBLIC_BASE_URL;

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/admin",
                    "/api/",
                    "/unauthorized",
                    "/check-email",
                    "/request-reset-password",
                    "/reset-password",
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
