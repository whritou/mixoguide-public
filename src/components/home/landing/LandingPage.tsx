import QRCode from "qrcode";
import { PLAY_STORE_URL } from "@/lib/play-store";
import { LandingHero } from "./LandingHero";
import { ShelfDemo } from "./ShelfDemo";
import { UnlockSection } from "./UnlockSection";
import { SeasonCollection } from "./SeasonCollection";
import { AndroidSection } from "./AndroidSection";

const QR_TARGET = `${PLAY_STORE_URL}&referrer=utm_source%3Dlanding`;

async function renderQr(): Promise<string> {
  const svg = await QRCode.toString(QR_TARGET, { type: "svg", margin: 0 });
  return svg.replace(/<path[^>]*fill="[^"]*"[^>]*\/>/, "").replace(/stroke="[^"]*"/, 'stroke="currentColor"');
}

export async function LandingPage({ sharedIds }: { sharedIds?: string[] }) {
  const qrSvg = await renderQr();
  return (
    <div data-landing-page className="bg-canvas text-fg">
      <LandingHero />
      <ShelfDemo sharedIds={sharedIds} />
      <UnlockSection />
      <SeasonCollection />
      <AndroidSection qrSvg={qrSvg} />
    </div>
  );
}
