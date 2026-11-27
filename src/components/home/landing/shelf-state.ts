import type { DemoBottle } from "@/lib/demo-bar/demo-bottles";
import type { MakeablePreview } from "@/types/models/cocktail";

export const EXAMPLE_KEYS = ["bourbon", "gin", "lemon", "lime", "syrup", "bitters"];

export const EXAMPLE_HINT = "This is an example bar. Tap to make it yours.";
export const SHARED_HINT = "This is a shared bar. Tap to make it yours.";
export const OWN_BAR_HINT = "Your bar stays on this device until you save it.";
export const UNREACHABLE_COPY = "Can't reach the bar right now. Try again in a moment.";

export function exampleIdsFrom(bottles: DemoBottle[]): string[] {
  return bottles
    .filter(b => EXAMPLE_KEYS.includes(b.key) && b.ingredientId !== null)
    .map(b => b.ingredientId as string);
}

export type ShelfStateInput = {
  bottles: DemoBottle[] | undefined;
  bottlesStatus: "pending" | "error" | "success";
  ids: string[];
  isExample: boolean;
  isShared?: boolean;
  preview: MakeablePreview | undefined;
  previewError: boolean;
  previewFetching: boolean;
};

export type ShelfState =
  | { view: "loading" }
  | { view: "error" }
  | {
      view: "ready";
      hint: string;
      menu: {
        preview: MakeablePreview | undefined;
        awaiting: boolean;
        dimmed: boolean;
        error: boolean;
      };
    };

export function deriveShelfState(input: ShelfStateInput): ShelfState {
  if (input.bottlesStatus === "error") return { view: "error" };
  if (input.bottlesStatus === "pending" || !input.bottles) return { view: "loading" };

  const hasBar = input.ids.length > 0;
  const preview = hasBar ? input.preview : undefined;
  const error = hasBar && input.previewError;

  return {
    view: "ready",
    hint: input.isShared ? SHARED_HINT : input.isExample ? EXAMPLE_HINT : OWN_BAR_HINT,
    menu: {
      preview,
      awaiting: hasBar && !preview && !error,
      dimmed: hasBar && !!preview && input.previewFetching,
      error,
    },
  };
}
