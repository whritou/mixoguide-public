import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const LINKS = [
  { label: "Cocktails", href: "/cocktails" },
  { label: "Android app", href: "#app" },
] as const;

const LINK_CLASS = "hidden min-h-11 items-center text-fg-on-image hover:text-brand-soft sm:inline-flex";

export function LandingNav() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6 sm:py-6 md:px-12">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center font-headline text-[22px] italic text-brand-soft sm:text-[26px]"
      >
        MixoGuide
      </Link>
      <nav aria-label="Main" className="flex items-center gap-x-2 text-sm sm:gap-x-8">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={LINK_CLASS}>
            {link.label}
          </Link>
        ))}
        <Link
          href="/signin"
          className="inline-flex min-h-11 items-center px-2 text-fg-on-image hover:text-brand-soft sm:px-0"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="inline-flex h-11 items-center rounded-[10px] border border-brand-soft/70 px-3.5 font-semibold text-fg-on-image hover:border-brand-soft hover:text-brand-soft sm:px-[18px]"
        >
          Create account
        </Link>
        <ThemeToggle className="size-11" />
      </nav>
    </header>
  );
}
