import Image from "next/image";
import type { DemoBottle, DemoShelf } from "@/lib/demo-bar/demo-bottles";
import { BottleToggle } from "./BottleToggle";

const SHELVES: { shelf: DemoShelf; label: string }[] = [
  { shelf: "spirits", label: "Spirits" },
  { shelf: "modifiers", label: "Liqueurs, vermouth and bitters" },
  { shelf: "fresh", label: "Fresh and pantry" },
];

type ShelfProps = {
  pressedIds: string[];
  onToggle: (ingredientId: string) => void;
};

export function ShelfRow({
  label,
  bottles,
  pressedIds,
  onToggle,
}: ShelfProps & { label: string; bottles: DemoBottle[] }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col">
      <span className="pb-2.5 text-[13px] font-semibold text-fg-muted">{label}</span>
      <div className="relative">
        <div className="relative z-[1] flex flex-wrap items-end px-2.5">
          {bottles.map(bottle => (
            <BottleToggle
              key={bottle.key}
              bottle={bottle}
              pressed={bottle.ingredientId !== null && pressedIds.includes(bottle.ingredientId)}
              onToggle={() => bottle.ingredientId && onToggle(bottle.ingredientId)}
            />
          ))}
        </div>
        <Image
          src="/landing/shelf.png"
          alt=""
          width={1200}
          height={46}
          unoptimized
          className="absolute inset-x-0 bottom-[53px] h-[46px] w-full object-cover object-left drop-shadow-lg"
        />
      </div>
    </div>
  );
}

export function Shelves({ bottles, pressedIds, onToggle }: ShelfProps & { bottles: DemoBottle[] }) {
  return (
    <>
      {SHELVES.map(({ shelf, label }) => (
        <ShelfRow
          key={shelf}
          label={label}
          bottles={bottles.filter(b => b.shelf === shelf)}
          pressedIds={pressedIds}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}
