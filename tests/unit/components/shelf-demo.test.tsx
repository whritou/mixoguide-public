import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));

import { Shelves } from "@/components/home/landing/ShelfRow";
import { TonightMenu } from "@/components/home/landing/TonightMenu";
import type { DemoBottle } from "@/lib/demo-bar/demo-bottles";
import { deriveShelfState, exampleIdsFrom, type ShelfState, type ShelfStateInput } from "@/components/home/landing/shelf-state";
import { resolveBar } from "@/lib/demo-bar/resolve-bar";
import type { MakeablePreview } from "@/types/models/cocktail";

const bottles: DemoBottle[] = [
  { key: "gin", ingredientId: "i-gin", label: "Gin", shelf: "spirits", image: "/landing/gin.png" },
  { key: "campari", ingredientId: "i-campari", label: "Campari", shelf: "modifiers", image: "/landing/campari.png" },
  { key: "lime", ingredientId: "i-lime", label: "Limes", shelf: "fresh", image: "/landing/lime.png" },
  { key: "soda", ingredientId: null, label: "Soda water", shelf: "fresh", image: "/landing/soda.png" },
];

const cocktail = (id: string, name: string, preparationTime?: number) =>
  ({ id, name, preparationTime }) as MakeablePreview["top"][number];

const text = (html: string) => html.replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("Shelves", () => {
  const html = renderToStaticMarkup(<Shelves bottles={bottles} pressedIds={["i-gin"]} onToggle={() => {}} />);

  it("renders the three labelled shelves", () => {
    for (const label of ["Spirits", "Liqueurs, vermouth and bitters", "Fresh and pantry"]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });

  it("marks pressed and unpressed bottles", () => {
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Gin"/);
    expect(html).toMatch(/aria-pressed="false"[^>]*aria-label="Campari"/);
    const images = html.match(/<img[^>]*>/g) ?? [];
    const gin = images.find(i => i.includes("gin.png"))!;
    const campari = images.find(i => i.includes("campari.png"))!;
    expect(gin).not.toContain("grayscale");
    expect(campari).toContain("grayscale opacity-35");
  });

  it("disables bottles without an ingredient", () => {
    expect(html).toMatch(/<button[^>]*aria-label="Soda water"[^>]*disabled/);
  });
});

describe("TonightMenu", () => {
  const preview: MakeablePreview = {
    makeableCount: 4,
    top: [cocktail("c1", "Old Fashioned", 4), cocktail("c2", "Gimlet"), cocktail("c3", "Daiquiri"), cocktail("c4", "Sour")],
    oneBottleAway: {
      ingredient: { id: "i-campari", name: "Campari" },
      unlocks: [{ id: "n", name: "Negroni" }, { id: "b", name: "Boulevardier" }],
    },
  };

  it("shows count, plural label, three lines and the remainder", () => {
    const html = renderToStaticMarkup(<TonightMenu preview={preview} ids={["i-gin"]} />);
    expect(html).toContain(">4<");
    expect(text(html)).toContain("cocktails with what you have");
    expect(html).toContain('href="/cocktails/c1"');
    expect(html).toContain('href="/cocktails/c3"');
    expect(html).not.toContain('href="/cocktails/c4"');
    expect(text(html)).toContain("and 1 more");
  });

  it("uses the singular label for one cocktail", () => {
    const html = renderToStaticMarkup(
      <TonightMenu preview={{ makeableCount: 1, top: [cocktail("c1", "Gimlet")], oneBottleAway: null }} ids={["i-gin"]} />,
    );
    expect(text(html)).toContain("cocktail with what you have");
    expect(text(html)).not.toContain("cocktails with what you have");
  });

  it("shows the empty copy", () => {
    const html = renderToStaticMarkup(
      <TonightMenu preview={{ makeableCount: 0, top: [], oneBottleAway: null }} ids={[]} />,
    );
    expect(text(html)).toContain("Nothing yet. Add a spirit, then something sour and something sweet.");
  });

  it("shows the empty copy when there is no preview and nothing is loading", () => {
    expect(text(renderToStaticMarkup(<TonightMenu ids={[]} />))).toContain("Nothing yet.");
  });

  it("renders the one-bottle-away line", () => {
    const html = renderToStaticMarkup(<TonightMenu preview={preview} ids={["i-gin"]} />);
    expect(text(html)).toContain("One bottle away: add Campari and you can also make Negroni and Boulevardier.");
  });

  it("shows a calm message on error", () => {
    const html = renderToStaticMarkup(<TonightMenu error ids={["i-gin"]} />);
    expect(text(html)).toContain("Can't reach the bar right now. Try again in a moment.");
  });

  it("announces updates politely and links the actions", () => {
    const html = renderToStaticMarkup(<TonightMenu preview={preview} ids={["i-gin"]} />);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('href="/signup"');
    expect(html).toMatch(/<button[^>]*>Share my bar<\/button>/);
  });
});

describe("TonightMenu states", () => {
  it("renders preparation time and singular unlock", () => {
    const html = renderToStaticMarkup(
      <TonightMenu
        preview={{
          makeableCount: 1,
          top: [cocktail("c1", "Old Fashioned", 4)],
          oneBottleAway: { ingredient: { id: "i", name: "Campari" }, unlocks: [{ id: "n", name: "Negroni" }] },
        }}
        ids={["i-gin"]}
      />,
    );
    expect(text(html)).toContain("4 min");
    expect(text(html)).toContain("One bottle away: add Campari and you can also make Negroni.");
  });

  it("awaiting shows a dash, never the empty copy", () => {
    const html = text(renderToStaticMarkup(<TonightMenu awaiting ids={["i-gin"]} />));
    expect(html).not.toContain("Nothing yet");
    expect(html).toContain("–");
  });

  it("dims the previous menu while refetching", () => {
    const html = renderToStaticMarkup(
      <TonightMenu dimmed preview={{ makeableCount: 1, top: [cocktail("c1", "Gimlet")], oneBottleAway: null }} ids={["i-gin"]} />,
    );
    expect(html).toContain("opacity-50");
  });
});

describe("deriveShelfState", () => {
  const preview: MakeablePreview = { makeableCount: 2, top: [], oneBottleAway: null };
  const base: ShelfStateInput = {
    bottles,
    bottlesStatus: "success",
    ids: ["i-gin"],
    isExample: false,
    preview,
    previewError: false,
    previewFetching: false,
  };
  const ready = (s: ShelfState) => {
    if (s.view !== "ready") throw new Error("expected ready");
    return s;
  };

  it("maps example keys to ingredient ids and skips null ids", () => {
    const withExample: DemoBottle[] = [
      { key: "bourbon", ingredientId: "i-b", label: "Bourbon", shelf: "spirits", image: "" },
      { key: "gin", ingredientId: null, label: "Gin", shelf: "spirits", image: "" },
      { key: "lemon", ingredientId: "i-l", label: "Lemons", shelf: "fresh", image: "" },
      { key: "rye", ingredientId: "i-r", label: "Rye", shelf: "spirits", image: "" },
    ];
    expect(exampleIdsFrom(withExample)).toEqual(["i-b", "i-l"]);
  });

  it("shows the empty state, not stale data, when ids are empty", () => {
    const s = ready(deriveShelfState({ ...base, ids: [] }));
    expect(s.menu.preview).toBeUndefined();
    expect(s.menu.awaiting).toBe(false);
  });

  it("is loading while bottles load", () => {
    expect(deriveShelfState({ ...base, bottles: undefined, bottlesStatus: "pending" }).view).toBe("loading");
  });

  it("is awaiting during the debounce when ids exist but no data yet", () => {
    const s = ready(deriveShelfState({ ...base, preview: undefined }));
    expect(s.menu.awaiting).toBe(true);
    expect(s.menu.error).toBe(false);
  });

  it("reports bottle and preview errors", () => {
    expect(deriveShelfState({ ...base, bottles: undefined, bottlesStatus: "error" }).view).toBe("error");
    const s = ready(deriveShelfState({ ...base, preview: undefined, previewError: true }));
    expect(s.menu.error).toBe(true);
    expect(s.menu.awaiting).toBe(false);
  });

  it("chooses the hint by example state", () => {
    expect(ready(deriveShelfState({ ...base, isExample: true })).hint).toBe(
      "This is an example bar. Tap to make it yours.",
    );
    expect(ready(deriveShelfState(base)).hint).toBe("Your bar stays on this device until you save it.");
  });

  it("dims only when refetching with a previous menu", () => {
    expect(ready(deriveShelfState({ ...base, previewFetching: true })).menu.dimmed).toBe(true);
    expect(ready(deriveShelfState(base)).menu.dimmed).toBe(false);
    expect(ready(deriveShelfState({ ...base, preview: undefined, previewFetching: true })).menu.dimmed).toBe(false);
  });
});

describe("shared bar", () => {
  const shared = ["i-gin", "i-lime"];
  const initial = ["i-bourbon"];

  it("overrides a stored bar and the example until the first tap", () => {
    expect(resolveBar({ stored: ["i-rum"], touched: false, shared, initial })).toEqual({ ids: shared, source: "shared" });
    expect(resolveBar({ stored: [], touched: false, shared, initial })).toEqual({ ids: shared, source: "shared" });
  });

  it("falls back to the stored bar, then the example, without a shared bar", () => {
    expect(resolveBar({ stored: ["i-rum"], touched: false, shared: [], initial })).toEqual({ ids: ["i-rum"], source: "own" });
    expect(resolveBar({ stored: [], touched: false, shared: [], initial })).toEqual({ ids: initial, source: "example" });
  });

  it("uses the stored bar after the first tap, even when it is empty", () => {
    expect(resolveBar({ stored: ["i-gin", "i-lime", "i-rum"], touched: true, shared, initial })).toEqual({
      ids: ["i-gin", "i-lime", "i-rum"],
      source: "own",
    });
    expect(resolveBar({ stored: [], touched: true, shared, initial })).toEqual({ ids: [], source: "own" });
  });

  it("shows the shared hint", () => {
    const s = deriveShelfState({
      bottles,
      bottlesStatus: "success",
      ids: shared,
      isExample: false,
      isShared: true,
      preview: undefined,
      previewError: false,
      previewFetching: false,
    });
    expect(s.view === "ready" && s.hint).toBe("This is a shared bar. Tap to make it yours.");
  });
});
