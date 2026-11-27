import { Geist_Mono, Noto_Serif, Manrope } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import Script from "next/script";

// Geist Sans was never applied (the body font resolves from :root, where
// globals.css maps --font-geist-sans to system-ui), so it is no longer loaded.
// Geist Mono is still referenced by `font-mono` utilities (meta labels, step
// numbers) but is never above-the-fold LCP text, so it is not preloaded.
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-geist-mono",
});
// Headlines use only the regular weight (Tailwind preflight resets h1–h6 to
// inherit and no `font-headline` usage sets a heavier weight), in roman + italic.
const notoSerif = Noto_Serif({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-noto-serif",
});
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const siteUrl = env.NEXT_PUBLIC_BASE_URL

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:  "MixoGuide | The Art of the Pour",
    template: "%s | MixoGuide",
  },
  description: "Elevate your home bar into a professional atelier. Curate your collection, master techniques, and discover cocktail recipes tailored to your pantry.",
  keywords: ["cocktails", "bartending", "home bar", "cocktail recipes", "mixology", "drink recipes", "pantry", "bar management"],
  openGraph: {
    type:        "website",
    siteName:    "MixoGuide",
    title:       "MixoGuide | The Art of the Pour",
    description: "Elevate your home bar into a professional atelier. Curate your collection, master techniques, and discover cocktail recipes tailored to your pantry.",
    images: [{ url: "/web-app-manifest-512x512.png", width: 512, height: 512, alt: "MixoGuide" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "MixoGuide | The Art of the Pour",
    description: "Elevate your home bar into a professional atelier. Curate your collection, master techniques, and discover cocktail recipes tailored to your pantry.",
    images:      ["/web-app-manifest-512x512.png"],
  },
  robots: {
    index:             true,
    follow:            true,
    googleBot: {
      index:  true,
      follow: true,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MixoGuide',
    url: siteUrl,
    description: 'Elevate your home bar into a professional atelier. Curate your collection, master techniques, and discover cocktail recipes tailored to your pantry.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/cocktails?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    hasPart: [
      {
        '@type': 'WebPage',
        name: 'Cocktails',
        url: `${siteUrl}/cocktails`,
        description: 'Browse our full collection of cocktail recipes. Filter by ingredients, flavours, occasions, and techniques to find your perfect drink.',
      },
      {
        '@type': 'WebPage',
        name: 'Ingredients',
        url: `${siteUrl}/ingredients`,
        description: 'Explore our complete ingredient library. Search spirits, mixers, bitters, and garnishes to discover what cocktails you can make.',
      },
    ],
  }

  return (
    <html lang="en" suppressHydrationWarning className={`${notoSerif.variable} ${manrope.variable}`}>
    <head>
      <meta name="apple-mobile-web-app-title" content="MixoGuide" />

      <meta
        name="google-adsense-account"
        content="ca-pub-5076887920413953"
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Script
        id="adsense-script"
        async
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5076887920413953"
      />
    </head>

    <body className={`${geistMono.variable} antialiased`}>
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-fg focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Skip to content
    </a>
    {/*
      The session provider lives in each top-level layout (via AppShell / the
      admin layout) instead of here: guarded layouts pass the server session so
      there is no client /api/auth/session round-trip or signed-out flicker,
      while public layouts stay static (calling getServerSession here would make
      every route dynamic).
    */}
    <ThemeProvider>
      <QueryProvider>
        {children}
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
    </body>
    </html>
  );
}
