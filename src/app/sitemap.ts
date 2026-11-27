import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

const baseUrl = env.NEXT_PUBLIC_BASE_URL;

// Regenerate at most hourly instead of querying the whole catalogue per request (BPERF-001).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [cocktails, ingredients] = await Promise.all([
        prisma.cocktail.findMany({ select: { id: true, updatedAt: true } }),
        prisma.ingredient.findMany({ select: { id: true, updatedAt: true } }),
    ]);

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: `${baseUrl}/cocktails`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/ingredients`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/bar-tools`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.6,
        },
        {
            url: `${baseUrl}/privacy-policy`,
            lastModified: new Date(),
            changeFrequency: "yearly",
            priority: 0.2,
        },
        {
            url: `${baseUrl}/terms-of-use`,
            lastModified: new Date(),
            changeFrequency: "yearly",
            priority: 0.2,
        },
        {
            url: `${baseUrl}/cookie-policy`,
            lastModified: new Date(),
            changeFrequency: "yearly",
            priority: 0.2,
        },
    ];

    const cocktailRoutes: MetadataRoute.Sitemap = cocktails.map((c) => ({
        url: `${baseUrl}/cocktails/${c.id}`,
        lastModified: c.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
    }));

    const ingredientRoutes: MetadataRoute.Sitemap = ingredients.map((i) => ({
        url: `${baseUrl}/ingredients/${i.id}`,
        lastModified: i.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
    }));

    return [...staticRoutes, ...cocktailRoutes, ...ingredientRoutes];
}
