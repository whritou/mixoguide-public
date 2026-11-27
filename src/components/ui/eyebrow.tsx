import * as React from "react";

import { cn } from "@/lib/utils";

function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[.28em] text-brand",
        className,
      )}
    >
      {children}
    </span>
  );
}

export { Eyebrow };
