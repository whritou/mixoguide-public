import Image from "next/image";
import { PLAY_STORE_URL } from "@/lib/play-store";
import { PhoneFrame } from "./PhoneFrame";

const PLAY_HREF = `${PLAY_STORE_URL}&referrer=utm_source%3Dlanding`;

const PANTRY_ROWS = [
  { name: "Sweet vermouth", status: "Running low", tone: "text-warning-accent" },
  { name: "Angostura bitters", status: "In stock", tone: "text-success" },
  { name: "Bourbon whiskey", status: "700 ml", tone: "text-success" },
] as const;

const TABS = ["Tonight", "Cocktails", "Pantry", "Planner"] as const;

function AppScreen() {
  return (
    <>
      <span className="font-headline text-[19px] italic text-brand">MixoGuide</span>
      <span className="font-headline text-[22px]">Tonight</span>
      <div className="overflow-hidden rounded-[14px] bg-surface">
        <div className="relative h-[130px]">
          <Image
            src="/landing/app-tonight.webp"
            alt=""
            fill
            sizes="292px"
            className="object-cover object-[55%_70%]"
          />
        </div>
        <div className="flex flex-col gap-[3px] px-3.5 py-3">
          <span className="font-headline text-base">Old Fashioned</span>
          <span className="text-[11px] text-fg-muted">3 of 3 ingredients, 4 min</span>
        </div>
      </div>
      {PANTRY_ROWS.map((row) => (
        <div
          key={row.name}
          className="flex justify-between rounded-xl bg-surface px-3.5 py-3 text-xs text-fg-secondary"
        >
          <span>{row.name}</span>
          <span className={row.tone}>{row.status}</span>
        </div>
      ))}
      <div className="-mx-4 mt-auto flex justify-between border-t border-line bg-surface px-5 pb-[22px] pt-3 text-[10px] font-semibold text-fg-muted">
        {TABS.map((tab, i) => (
          <span key={tab} className={i === 0 ? "text-brand" : undefined}>
            {tab}
          </span>
        ))}
      </div>
    </>
  );
}

export function AndroidSection({ qrSvg }: { qrSvg: string }) {
  return (
    <div className="dark">
      <section id="app" className="border-t border-line bg-canvas text-fg">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-16 px-6 py-[88px] md:px-12">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[22px]">
            <h2 className="m-0 font-headline text-[46px] font-normal leading-[1.1] tracking-[-0.01em] [text-wrap:balance]">
              MixoGuide behind the bar
            </h2>
            <p className="m-0 max-w-[46ch] text-[17px] leading-[27px] text-fg-secondary">
              The Android app keeps your pantry and tonight&apos;s recipes in your pocket, with a dark
              mode made for low light. Sign in and your bar is already there.
            </p>
            <div className="flex flex-wrap items-center gap-7 pt-2">
              <a
                href={PLAY_HREF}
                className="inline-flex h-14 items-center gap-3 rounded-[10px] bg-fg px-[22px] text-canvas"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4 2.6v18.8c0 .5.5.8.9.5L20 12.9c.6-.4.6-1.4 0-1.8L4.9 2.1c-.4-.3-.9 0-.9.5z" />
                </svg>
                <span className="flex flex-col leading-[1.15]">
                  <span className="text-[11px]">Get it on</span>
                  <span className="text-[17px] font-bold">Google Play</span>
                </span>
              </a>
              <div className="hidden items-center gap-3.5 md:flex">
                <div
                  role="img"
                  aria-label="QR code to the Google Play listing"
                  className="size-[84px] rounded-md bg-fg p-[7px] text-canvas [&>svg]:block [&>svg]:size-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <span className="max-w-[15ch] text-sm leading-5 text-fg-muted">
                  Scan to continue on your phone
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-[0_1_340px] justify-center">
            <PhoneFrame>
              <AppScreen />
            </PhoneFrame>
          </div>
        </div>
      </section>
    </div>
  );
}
