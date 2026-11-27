import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { SmartCollection } from "@/hooks/queries/use-smart-collections";

const query = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/hooks/queries/use-smart-collections", () => ({
  useSmartCollectionsQuery: () => query.current,
}));

import { UnlockSection } from "@/components/home/landing/UnlockSection";
import { AndroidSection } from "@/components/home/landing/AndroidSection";
import { SeasonCollection, pickSeasonCollection } from "@/components/home/landing/SeasonCollection";

const makeCollection = (over: Partial<SmartCollection> = {}): SmartCollection => ({
  slug: "evergreen",
  title: "Evergreen",
  subtitle: "Always good.",
  icon: "sparkles",
  accent: "caramel",
  defaultServings: 4,
  defaultDayOffset: 0,
  occasions: [],
  cocktailCount: 7,
  cocktails: Array.from({ length: 7 }, (_, i) => ({
    id: `c${i}`,
    name: `Drink ${i}`,
    imageUrl: null,
    isAlcoholic: true,
    difficulty: "EASY",
    avgRating: null,
    ratingCount: 0,
  })),
  ...over,
});

describe("UnlockSection", () => {
  const html = renderToStaticMarkup(<UnlockSection />);

  it("renders heading and both entries", () => {
    expect(html).toMatch(/<h2[^>]*>Keep your bar\. Plan the evening\.<\/h2>/);
    expect(html).toContain(">Your real pantry<");
    expect(html).toContain(">Planned cocktails and events<");
  });

  it("has one sign-up link with the glow", () => {
    const links = html.match(/<a[^>]*>Create your account<\/a>/g) ?? [];
    expect(links).toHaveLength(1);
    expect(links[0]).toContain('href="/signup"');
    expect(links[0]).toContain("shadow-glow");
  });
});

describe("AndroidSection", () => {
  const html = renderToStaticMarkup(<AndroidSection qrSvg="<svg></svg>" />);

  it("renders the heading and a dark scope with id app", () => {
    expect(html).toMatch(/<h2[^>]*>MixoGuide behind the bar<\/h2>/);
    expect(html).toMatch(/^<div class="dark"><section id="app"/);
  });

  it("links Google Play with the landing referrer", () => {
    expect(html).toMatch(/<a[^>]*href="[^"]*referrer=utm_source%3Dlanding"/);
  });

  it("exposes the QR as an image and hides it below md", () => {
    expect(html).toMatch(/<div role="img" aria-label="QR code to the Google Play listing"/);
    expect(html).toMatch(/class="hidden[^"]*md:flex"/);
  });
});

describe("pickSeasonCollection", () => {
  it("prefers a collection with a season", () => {
    const seasonal = makeCollection({
      slug: "winter",
      season: { from: { month: 12, day: 1 }, to: { month: 3, day: 19 } },
    });
    expect(pickSeasonCollection([makeCollection(), seasonal])).toBe(seasonal);
  });

  it("skips collections without cocktails", () => {
    const stocked = makeCollection({ slug: "stocked" });
    expect(pickSeasonCollection([makeCollection({ slug: "empty", cocktails: [] }), stocked])).toBe(stocked);
  });

  it("falls back to the first", () => {
    const first = makeCollection();
    expect(pickSeasonCollection([first, makeCollection({ slug: "b" })])).toBe(first);
  });
});

describe("SeasonCollection", () => {
  beforeEach(() => {
    query.current = {};
  });

  it("shows a skeleton while loading", () => {
    query.current = { isPending: true, isError: false, data: undefined };
    const html = renderToStaticMarkup(<SeasonCollection />);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('id="collection"');
  });

  it("hides the section on error", () => {
    query.current = { isPending: false, isError: true, data: undefined };
    expect(renderToStaticMarkup(<SeasonCollection />)).toBe("");
  });

  it("renders at most six menu lines and the browse link", () => {
    query.current = { isPending: false, isError: false, data: [makeCollection({ title: "Cozy Winter" })] };
    const html = renderToStaticMarkup(<SeasonCollection />);
    expect(html).toContain(">Cozy Winter<");
    expect(html.match(/href="\/cocktails\/c\d"/g)).toHaveLength(6);
    expect(html).toMatch(/<a[^>]*href="\/cocktails"[^>]*>Browse all cocktails<\/a>/);
  });
});
