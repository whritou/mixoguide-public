"use client";

import Image from "next/image";
import Link from "next/link";
import { useSmartCollectionsQuery, type SmartCollection } from "@/hooks/queries/use-smart-collections";

const MAX_LINES = 6;

export function pickSeasonCollection(collections: SmartCollection[]): SmartCollection | undefined {
  const stocked = collections.filter((collection) => collection.cocktails.length > 0);
  return stocked.find((collection) => collection.season) ?? stocked[0];
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function SeasonCollection() {
  const { data, isPending, isError } = useSmartCollectionsQuery();
  const collection = data ? pickSeasonCollection(data) : undefined;

  if (isError || (!isPending && !collection)) return null;

  return (
    <section
      id="collection"
      className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-16 px-6 py-[104px] md:px-12"
    >
      <div className="relative aspect-[4/5] w-full min-w-0 max-w-[360px] flex-[1_1_300px] overflow-hidden rounded-2xl">
        <Image
          src="/landing/collection.webp"
          alt="Bitters dropped onto the foam of a cocktail in a coupe"
          fill
          sizes="(min-width: 768px) 360px, 90vw"
          className="object-cover object-[50%_45%]"
        />
      </div>
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-8">
        {collection ? (
          <>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-semibold text-brand">This season&apos;s collection</span>
              <h2 className="m-0 font-headline text-[54px] font-normal italic leading-[1.05] tracking-[-0.01em]">
                {collection.title}
              </h2>
              <p className="m-0 text-[17px] leading-[27px] text-fg-secondary">
                {collection.subtitle} Every recipe is free to read.
              </p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-x-12 border-t border-line-strong">
              {collection.cocktails.slice(0, MAX_LINES).map((cocktail) => (
                <Link
                  key={cocktail.id}
                  href={`/cocktails/${cocktail.id}`}
                  className="flex items-baseline gap-2 border-b border-line py-4"
                >
                  <span className="font-headline text-[21px] text-fg">{cocktail.name}</span>
                  <span className="flex-1 border-b border-dotted border-line-strong" aria-hidden="true" />
                  <span className="text-[13px] text-fg-muted">{capitalise(cocktail.difficulty)}</span>
                </Link>
              ))}
            </div>
            <Link href="/cocktails" className="self-start text-[15px] font-semibold underline underline-offset-[5px]">
              Browse all cocktails
            </Link>
          </>
        ) : (
          <div aria-busy="true" className="flex flex-col gap-8">
            <div className="h-[140px] animate-pulse rounded-md bg-surface-muted" />
            <div className="h-[260px] animate-pulse rounded-md bg-surface-muted" />
          </div>
        )}
      </div>
    </section>
  );
}
