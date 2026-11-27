import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ENTRIES = [
  {
    title: "Your real pantry",
    body: "Every bottle and fresh ingredient you own, with how much is left. See what's running low and every drink you can make, substitutes included.",
  },
  {
    title: "Planned cocktails and events",
    body: "Set the guest list and pick the drinks. Get recipes scaled for the night, a grocery list, and a printed menu for the bar.",
  },
] as const;

export function UnlockSection() {
  return (
    <section className="border-y border-line bg-surface-subtle">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-[72px] px-6 py-[104px] md:px-12">
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-7">
          <h2 className="m-0 font-headline text-[46px] font-normal leading-[1.1] tracking-[-0.01em] [text-wrap:balance]">
            Keep your bar. Plan the evening.
          </h2>
          <p className="m-0 max-w-[46ch] text-[17px] leading-[27px] text-fg-secondary">
            The shelf above is a taste. An account turns it into your own bar, and into nights you
            host.
          </p>
          <div className="flex flex-col border-t border-line-strong">
            {ENTRIES.map((entry) => (
              <div key={entry.title} className="flex flex-col gap-1.5 border-b border-line-strong py-5">
                <h3 className="m-0 font-headline text-[22px] font-normal">{entry.title}</h3>
                <p className="m-0 max-w-[52ch] text-[15px] leading-6 text-fg-secondary">{entry.body}</p>
              </div>
            ))}
          </div>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: "pill" }),
              "h-[52px] self-start px-[30px] text-[13px] font-bold",
            )}
          >
            Create your account
          </Link>
        </div>
        <div className="flex min-w-0 flex-[1_1_420px] justify-center">
          <div className="relative w-full max-w-[460px] pb-12 pl-16">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
              <Image
                src="/landing/unlock.webp"
                alt="A bartender strains a pale green cocktail into a martini glass"
                fill
                sizes="(min-width: 768px) 400px, 80vw"
                className="object-cover object-[50%_60%]"
              />
            </div>
            <Image
              src="/landing/party-menu.png"
              alt="A printed party menu for a Winter Soirée: Boulevardier, Hot Toddy and French 75"
              width={492}
              height={598}
              sizes="250px"
              className="absolute bottom-0 left-0 h-auto w-[250px] [filter:drop-shadow(0_24px_28px_rgb(0_0_0/0.55))]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
