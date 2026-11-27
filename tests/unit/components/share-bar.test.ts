import { describe, expect, it, vi } from "vitest";
import { shareBar } from "@/components/home/landing/share-bar";
import { encodeBarParam } from "@/lib/demo-bar/bar-param";

const ids = ["b", "a"];
const url = `https://mixo.test/bar?i=${encodeBarParam(ids)}`;

describe("shareBar", () => {
  it("uses the Web Share API with the absolute URL", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    const notify = vi.fn();
    await shareBar(ids, { origin: "https://mixo.test", share, writeText, notify });
    expect(share).toHaveBeenCalledWith({ title: "My bar on MixoGuide", url });
    expect(writeText).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("treats a cancelled share as a no-op", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("cancelled"), { name: "AbortError" }));
    const notify = vi.fn();
    await shareBar(ids, { origin: "https://mixo.test", share, notify });
    expect(notify).not.toHaveBeenCalled();
  });

  it("reports other share failures", async () => {
    const notify = vi.fn();
    await shareBar(ids, { origin: "https://mixo.test", share: vi.fn().mockRejectedValue(new Error("boom")), notify });
    expect(notify).toHaveBeenCalledWith("Could not share the link", "error");
  });

  it("copies the link and toasts when sharing is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn();
    await shareBar(ids, { origin: "https://mixo.test", writeText, notify });
    expect(writeText).toHaveBeenCalledWith(url);
    expect(notify).toHaveBeenCalledWith("Link copied");
  });

  it("does not throw when the clipboard fails or is missing", async () => {
    const notify = vi.fn();
    await expect(
      shareBar(ids, { origin: "https://mixo.test", writeText: vi.fn().mockRejectedValue(new Error("denied")), notify }),
    ).resolves.toBeUndefined();
    await expect(shareBar(ids, { origin: "https://mixo.test", notify })).resolves.toBeUndefined();
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith("Could not copy the link", "error");
  });
});
