import { Courier_Prime } from "next/font/google";
import { cn } from "@/lib/utils";
import styles from "./RecipeCard.module.css";

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

type RecipeCardProps = {
  name: string;
  time: string;
  lines: { qty: string; item: string }[];
  method: string;
};

export function RecipeCard({ name, time, lines, method }: RecipeCardProps) {
  return (
    <aside
      aria-label="Recipe in the photo"
      className="rotate-2 [filter:drop-shadow(0_22px_26px_rgb(0_0_0/0.6))_drop-shadow(0_2px_3px_rgb(0_0_0/0.45))]"
    >
      <div className={styles.card}>
        <svg className={styles.grain} aria-hidden="true">
          <filter id="mg-paper-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.24  0 0 0 0.5 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#mg-paper-grain)" />
        </svg>
        <div className={styles.redLine} aria-hidden="true" />
        <div className={styles.stain} aria-hidden="true" />
        <div className="relative flex flex-col">
          <div className="flex h-[46px] items-baseline justify-between gap-3">
            <span className="font-headline text-[25px] italic">{name}</span>
            <span className={cn(courierPrime.className, styles.time, "text-[13px]")}>{time}</span>
          </div>
          <div
            className={cn(
              courierPrime.className,
              "grid grid-cols-[auto_1fr] gap-x-3.5 pt-0.5 text-[15px] leading-7",
            )}
          >
            {lines.map((line) => (
              <div key={`${line.qty}-${line.item}`} className="contents">
                <span className="font-bold">{line.qty}</span>
                <span>{line.item}</span>
              </div>
            ))}
          </div>
          <p className={cn(courierPrime.className, styles.method, "m-0 pt-7 text-sm leading-7")}>
            {method}
          </p>
        </div>
      </div>
    </aside>
  );
}
