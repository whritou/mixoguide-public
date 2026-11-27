"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { persistDisplayedBar } from "@/lib/demo-bar/storage";
import { ShareBarButton } from "./ShareBarButton";

export function SaveMyBar({ ids }: { ids: string[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      <button
        type="button"
        onClick={() => {
          persistDisplayedBar(ids);
          signIn("google", { callbackUrl: "/" });
        }}
        className="flex h-12 items-center justify-center rounded-[10px] bg-brand text-[15px] font-bold text-fg-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Save my bar with Google
      </button>
      <div className="flex justify-between gap-3 text-sm">
        <Link href="/signup" onClick={() => persistDisplayedBar(ids)} className="text-fg-secondary">
          Use email instead
        </Link>
        <ShareBarButton ids={ids} />
      </div>
    </div>
  );
}
