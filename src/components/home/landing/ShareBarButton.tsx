"use client";

import { toast } from "sonner";
import { persistDisplayedBar } from "@/lib/demo-bar/storage";
import { shareBar } from "./share-bar";

export function ShareBarButton({ ids }: { ids: string[] }) {
  function share() {
    persistDisplayedBar(ids);
    return shareBar(ids, {
      origin: window.location.origin,
      share: typeof navigator.share === "function" ? data => navigator.share(data) : undefined,
      writeText: navigator.clipboard ? text => navigator.clipboard.writeText(text) : undefined,
      notify: (message, kind) => (kind === "error" ? toast.error(message) : toast(message)),
    });
  }

  return (
    <button type="button" onClick={share} className="font-semibold">
      Share my bar
    </button>
  );
}
