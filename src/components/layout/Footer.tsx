"use client";

import { Instagram } from "lucide-react";
import Link from "next/link";

const INSTAGRAM_URL = "https://www.instagram.com/mixoguide/";

export function Footer() {

    return (
        <footer className="bg-surface-hover flex flex-col md:flex-row justify-between items-center px-6 md:px-12 py-12 lg:py-16 gap-8 w-full">
            <div className="flex flex-col items-center md:items-start gap-2">
                <span className="font-headline text-xl italic text-brand">Mixoguide</span>
                <p className="text-sm text-fg-secondary font-body">
                    &copy; {new Date().getFullYear()} Mixoguide. All rights reserved.
                </p>
            </div>

            <nav aria-label="Footer" className="flex gap-6 lg:gap-8 flex-wrap justify-center items-center">
                <a
                    href="https://www.buymeacoffee.com/Whritou"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand text-fg-on-brand text-sm font-medium motion-safe:hover:scale-105 transition-transform"
                >
                    <span aria-hidden="true">🍸</span> Buy me a cocktail
                    <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-brand-soft/30 bg-surface/60 text-brand text-sm font-medium hover:bg-surface hover:border-brand-soft transition-colors"
                >
                    <Instagram size={15} aria-hidden="true" />
                    <span>Follow @mixoguide</span>
                    <span className="sr-only"> on Instagram (opens in a new tab)</span>
                </a>
                <Link href="/cocktails" className="text-sm text-fg-secondary hover:text-brand-soft-strong transition-colors font-body">
                    Cocktails
                </Link>
                <Link href="/ingredients" className="text-sm text-fg-secondary hover:text-brand-soft-strong transition-colors font-body">
                    Ingredients
                </Link>
            </nav>

            <nav aria-label="Legal" className="flex gap-6 lg:gap-8 flex-wrap justify-center">
                <Link href="/privacy-policy" className="text-sm text-fg-secondary hover:text-brand-soft-strong transition-colors font-body">
                    Privacy Policy
                </Link>
                <Link href="/terms-of-use" className="text-sm text-fg-secondary hover:text-brand-soft-strong transition-colors font-body">
                    Terms of Use
                </Link>
                <Link href="/cookie-policy" className="text-sm text-fg-secondary hover:text-brand-soft-strong transition-colors font-body">
                    Cookie Policy
                </Link>
            </nav>
        </footer>
    );
}
