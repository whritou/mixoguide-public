
import { Geist, Geist_Mono, Noto_Serif, Manrope } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import AuthProvider from "@/components/AuthProvider";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import Script from "next/script";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const notoSerif = Noto_Serif({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
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
      {
        '@type': 'WebPage',
        name: 'Makeable Cocktails',
        url: `${siteUrl}/makeable`,
        description: 'See every cocktail you can make right now based on what\'s in your pantry.',
      },
    ],
  }

  return (
    <html lang="en" className={`${notoSerif.variable} ${manrope.variable}`}>
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

    <body
      className={`
        ${geistSans.variable}
        ${geistMono.variable}
        ${notoSerif.variable}
        ${manrope.variable}
        antialiased
      `}
    >
    <AuthProvider>
      <QueryProvider>
        {children}
        <Toaster />
      </QueryProvider>
    </AuthProvider>
    </body>
    </html>
  );
}
