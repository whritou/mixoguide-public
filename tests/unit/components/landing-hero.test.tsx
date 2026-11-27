import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/font/google", () => ({
  Courier_Prime: () => ({ className: "courier-prime", variable: "--font-courier-prime" }),
}));

import { LandingHero } from "@/components/home/landing/LandingHero";
import { LandingNav } from "@/components/home/landing/LandingNav";

describe("LandingHero", () => {
  const html = renderToStaticMarkup(<LandingHero />);

  it("renders the headline", () => {
    expect(html).toMatch(/<h1[^>]*>Tonight(?:'|&#x27;)s drink is already on your shelf\.<\/h1>/);
  });

  it("links to the shelf and to sign up", () => {
    expect(html).toMatch(/<a[^>]*href="#shelf"[^>]*>See what you can make<\/a>/);
    expect(html).toMatch(/<a[^>]*href="\/signup"[^>]*>Create a free account<\/a>/);
  });

  it("renders the recipe card with real text", () => {
    for (const text of ["60 ml", "bourbon", "1 tsp", "demerara syrup", "2 dashes", "Angostura bitters", "Old Fashioned", "4 min"]) {
      expect(html).toContain(`>${text}<`);
    }
    expect(html).toContain("Stir over ice, 30 seconds. Strain over one large cube. Flame an orange peel across the glass.");
  });

  it("describes the photo", () => {
    expect(html).toMatch(/<img[^>]*alt="A flamed Old Fashioned on a dark bar"/);
  });

  it("scopes the hero to the dark theme", () => {
    expect(html).toMatch(/class="dark[ "]/);
  });
});

describe("LandingNav", () => {
  const html = renderToStaticMarkup(<LandingNav />);

  it("links to the public destinations", () => {
    for (const href of ["/cocktails", "#app", "/signin", "/signup"]) {
      expect(html).toContain(`href="${href}"`);
    }
    for (const label of ["Cocktails", "Android app", "Sign in", "Create account"]) {
      expect(html).toContain(`>${label}<`);
    }
  });
});
