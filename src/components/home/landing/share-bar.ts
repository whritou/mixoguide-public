import { encodeBarParam } from "@/lib/demo-bar/bar-param";

export type ShareDeps = {
  origin: string;
  share?: (data: { title: string; url: string }) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
  notify: (message: string, kind?: "error") => void;
};

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

export async function shareBar(ids: string[], deps: ShareDeps): Promise<void> {
  const url = `${deps.origin}/bar?i=${encodeBarParam(ids)}`;
  if (deps.share) {
    try {
      await deps.share({ title: "My bar on MixoGuide", url });
    } catch (error) {
      if (!isAbort(error)) deps.notify("Could not share the link", "error");
    }
    return;
  }
  try {
    if (!deps.writeText) throw new Error("clipboard unavailable");
    await deps.writeText(url);
    deps.notify("Link copied");
  } catch {
    deps.notify("Could not copy the link", "error");
  }
}
