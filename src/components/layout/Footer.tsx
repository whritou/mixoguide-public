"use client";

import { Instagram } from "lucide-react";
import Link from "next/link";

const INSTAGRAM_URL = "https://www.instagram.com/mixoguide/";

export function Footer() {

    return (
        <footer className="bg-mg-smoke flex flex-col md:flex-row justify-between items-center px-6 md:px-12 py-12 lg:py-16 gap-8 w-full">
            <div className="flex flex-col items-center md:items-start gap-2">
                <span className="font-headline text-xl italic text-mg-brown">Mixoguide</span>
                <p className="text-sm text-mg-ink/70 font-body">
                    &copy; {new Date().getFullYear()} Mixoguide. All rights reserved.
                </p>
            </div>

            <div className="flex gap-6 lg:gap-8 flex-wrap justify-center items-center">
                <a
                    href="https://www.buymeacoffee.com/Whritou"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-mg-caramel text-white text-sm font-medium hover:scale-105 transition-transform"
                >
                    🍸 Buy me a cocktail
                </a>
                <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow MixoGuide on Instagram"
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-mg-caramel/30 bg-white/60 text-mg-brown text-sm font-medium hover:bg-white hover:border-mg-caramel transition-colors"
                >
                    <Instagram size={15} aria-hidden="true" />
                    <span>Follow @mixoguide</span>
                </a>
                <Link href="/cocktails" className="text-sm text-mg-ink/70 hover:text-mg-caramel transition-colors font-body">
                    Cocktails
                </Link>
                <Link href="/ingredients" className="text-sm text-mg-ink/70 hover:text-mg-caramel transition-colors font-body">
                    Ingredients
                </Link>
            </div>

            <div className="flex gap-6 lg:gap-8 flex-wrap justify-center">
                <Link href="/privacy-policy" className="text-sm text-mg-ink/70 hover:text-mg-caramel transition-colors font-body">
                    Privacy Policy
                </Link>
                <Link href="/terms-of-use" className="text-sm text-mg-ink/70 hover:text-mg-caramel transition-colors font-body">
                    Terms of Use
                </Link>
                <Link href="/cookie-policy" className="text-sm text-mg-ink/70 hover:text-mg-caramel transition-colors font-body">
                    Cookie Policy
                </Link>
            </div>
        </footer>
    );
}
