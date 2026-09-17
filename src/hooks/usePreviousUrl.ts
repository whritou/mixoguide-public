"use client";

import { usePathname } from "next/navigation";

export function useCallbackUrl() {
  const pathname = usePathname();
  return pathname ?? "/";
}
