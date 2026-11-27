import Image from "next/image";
import Link from "next/link";
import { LandingNav } from "./LandingNav";
import { RecipeCard } from "./RecipeCard";

const OLD_FASHIONED = {
  name: "Old Fashioned",
  time: "5 min",
  lines: [
    { qty: "1.5 oz", item: "bourbon" },
    { qty: "1 tbsp", item: "sugar" },
    { qty: "0.2 oz", item: "Angostura bitters" },
    { qty: "dash", item: "water" },
  ],
  method: "Soak the sugar with the bitters and a dash of water, muddle until dissolved. Fill with ice, add the bourbon. Garnish with an orange twist and a cherry.",
};

const SCRIM =
  "linear-gradient(90deg, color-mix(in srgb, var(--surface-inverse) 88%, transparent) 0%, color-mix(in srgb, var(--surface-inverse) 62%, transparent) 38%, color-mix(in srgb, var(--surface-inverse) 8%, transparent) 68%, color-mix(in srgb, var(--surface-inverse) 30%, transparent) 100%)";

export function LandingHero() {
  return (
    <div className="dark">
      <section className="relative overflow-hidden bg-canvas text-fg">
        <Image
          src="/landing/hero.webp"
          alt="A flamed Old Fashioned on a dark bar"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_58%]"
        />
        <div className="absolute inset-0 bg-overlay/60" aria-hidden="true" />
        <div className="absolute inset-0" style={{ backgroundImage: SCRIM }} aria-hidden="true" />
        <div className="absolute inset-0 bg-surface-inverse/40 lg:hidden" aria-hidden="true" />
        <div
          className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-surface-inverse/90 via-surface-inverse/75 to-transparent md:h-40"
          aria-hidden="true"
        />
        <div className="relative flex min-h-[700px] flex-col">
          <LandingNav />
          <div className="flex flex-1 flex-wrap items-end justify-between gap-10 px-6 pb-16 pt-12 md:px-12">
            <div className="flex min-w-0 max-w-[640px] flex-[1_1_520px] flex-col gap-6">
              <h1 className="m-0 font-headline text-[clamp(44px,5.6vw,78px)] font-normal italic leading-[1.02] tracking-[-0.015em] text-fg-on-image [text-wrap:balance]">
                Tonight&apos;s drink is already on your shelf.
              </h1>
              <p className="m-0 max-w-[44ch] text-lg leading-7 text-fg-secondary">
                Tell MixoGuide which bottles you own. It hands you the cocktails you can make right
                now, measured and timed like a bartender would.
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <a
                  href="#shelf"
                  className="inline-flex h-[52px] items-center rounded-[10px] bg-brand px-7 text-[15px] font-bold text-fg-on-brand"
                >
                  See what you can make
                </a>
                <Link
                  href="/signup"
                  className="text-[15px] font-semibold text-fg-on-image underline underline-offset-[5px]"
                >
                  Create a free account
                </Link>
              </div>
            </div>
            <div className="w-full max-w-[310px] flex-[0_1_310px]">
              <RecipeCard {...OLD_FASHIONED} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
