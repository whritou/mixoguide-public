import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",

    poweredByHeader: false,

    images: {
        remotePatterns: [
            { protocol: "https", hostname: "res.cloudinary.com" },
            { protocol: "https", hostname: "images.unsplash.com" },
            { protocol: "https", hostname: "cdn.pexels.com" },
            { protocol: "https", hostname: "images.pexels.com" },
            { protocol: "https", hostname: "www.thecocktaildb.com" },
            { protocol: "https", hostname: "upload.wikimedia.org" },
            { protocol: "https", hostname: "lh3.googleusercontent.com" },
            { protocol: "https", hostname: "api.qrserver.com" },
        ],
    },

    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=31536000; includeSubDomains; preload",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                    {
                        key: "Content-Security-Policy",
                        value: [
                            "default-src 'self'",
                            // Images served from Cloudinary, Unsplash, Pexels,
                            // TheCocktailDB, and Wikimedia per next.config images.
                            // Includes AdSense image hosts used for ad creatives.
                            "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://cdn.pexels.com https://images.pexels.com https://www.thecocktaildb.com https://upload.wikimedia.org https://lh3.googleusercontent.com https://api.qrserver.com https://*.googlesyndication.com https://*.doubleclick.net https://*.g.doubleclick.net",
                            // 'unsafe-inline' is still required by Next.js for its
                            // streaming SSR runtime; remove once nonces are wired
                            // through middleware.
                            // 'unsafe-eval' is added in development only -- React
                            // dev mode uses eval() to reconstruct callstacks and
                            // Turbopack HMR relies on it too. Production never
                            // ships it.
                            // Adds AdSense script domains.
                            `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net`,
                            // Tailwind ships utility classes only; inline styles
                            // come from React style props.
                            "style-src 'self' 'unsafe-inline'",
                            "font-src 'self' data:",
                            // Includes AdSense request endpoints.
                            "connect-src 'self' https://challenges.cloudflare.com https://api.cloudinary.com https://res.cloudinary.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://*.g.doubleclick.net",
                            // Includes AdSense ad frames.
                            "frame-src 'self' https://challenges.cloudflare.com https://*.googlesyndication.com https://*.doubleclick.net https://*.g.doubleclick.net",
                            "frame-ancestors 'self'",
                            "form-action 'self'",
                            "base-uri 'self'",
                            "object-src 'none'",
                        ].join("; "),
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
