import Link from "next/link";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DecoDivider } from "@/components/ui/deco-divider";
import type { MakeablePreview } from "@/types/models/cocktail";
import { SaveMyBar } from "./SaveMyBar";

const MAX_LINES = 3;

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function TonightMenu({
  preview,
  awaiting = false,
  dimmed = false,
  error = false,
  ids,
}: {
  preview?: MakeablePreview;
  awaiting?: boolean;
  dimmed?: boolean;
  error?: boolean;
  ids: string[];
}) {
  const count = preview?.makeableCount ?? 0;
  const lines = preview?.top.slice(0, MAX_LINES) ?? [];
  const more = count - lines.length;
  const away = preview?.oneBottleAway ?? null;
  const unknown = awaiting || error;
  const empty = !unknown && count === 0;

  return (
    <div
      aria-live="polite"
      className="flex min-w-0 max-w-[440px] flex-[1_1_360px] flex-col gap-[22px] rounded-sm border border-line-brass bg-surface px-7 pb-7 pt-8 shadow-xl"
    >
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Eyebrow className="text-[11px] tracking-[.24em]">Tonight you can make</Eyebrow>
        <span className="font-headline text-[72px] leading-none text-fg [font-variant-numeric:lining-nums]">
          {unknown ? "–" : count}
        </span>
        <span className="text-sm text-fg-muted">
          {count === 1 ? "cocktail with what you have" : "cocktails with what you have"}
        </span>
        <DecoDivider className="w-[180px] gap-2.5 pt-1.5 text-[9px]" />
      </div>

      <div className={cn("flex flex-col transition-opacity", dimmed && "opacity-50")}>
        {error ? (
          <p className="m-0 text-center text-sm leading-[22px] text-fg-secondary">
            Can&apos;t reach the bar right now. Try again in a moment.
          </p>
        ) : (
          <>
            {lines.map(cocktail => (
              <Link
                key={cocktail.id}
                href={`/cocktails/${cocktail.id}`}
                className="flex items-baseline gap-2 border-b border-line py-3"
              >
                <span className="font-headline text-xl text-fg">{cocktail.name}</span>
                <span className="flex-1 border-b border-dotted border-line-strong" aria-hidden="true" />
                {cocktail.preparationTime ? (
                  <span className="text-xs text-fg-muted">{cocktail.preparationTime} min</span>
                ) : null}
              </Link>
            ))}
            {more > 0 && <span className="pt-3 text-[13px] text-fg-muted">and {more} more</span>}
            {empty && (
              <p className="m-0 text-center text-sm leading-[22px] text-fg-secondary">
                Nothing yet. Add a spirit, then something sour and something sweet.
              </p>
            )}
          </>
        )}
      </div>

      {!error && away && (
        <p className="m-0 text-sm leading-[22px] text-fg-secondary">
          <strong className="text-fg">One bottle away:</strong>{" "}
          {`add ${away.ingredient.name} and you can also make ${joinNames(away.unlocks.map(u => u.name))}.`}
        </p>
      )}

      <SaveMyBar ids={ids} />
    </div>
  );
}
