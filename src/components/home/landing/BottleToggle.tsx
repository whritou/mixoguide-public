import Image from "next/image";
import { cn } from "@/lib/utils";
import type { DemoBottle } from "@/lib/demo-bar/demo-bottles";

export function BottleToggle({
  bottle,
  pressed,
  onToggle,
}: {
  bottle: DemoBottle;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={bottle.label}
      disabled={bottle.ingredientId === null}
      onClick={onToggle}
      className="flex w-[86px] cursor-pointer flex-col items-center rounded-md border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed"
    >
      <Image
        src={bottle.image}
        alt=""
        width={109}
        height={200}
        unoptimized
        className={cn(
          "mx-[-12px] block h-[200px] w-[109px] max-w-none transition-[filter,opacity] duration-200",
          pressed ? "" : "grayscale opacity-35",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "box-border h-[42px] px-0.5 pt-2 text-center text-xs leading-[15px]",
          pressed ? "font-semibold text-fg" : "font-medium text-fg-muted",
        )}
      >
        {bottle.label}
      </span>
    </button>
  );
}
