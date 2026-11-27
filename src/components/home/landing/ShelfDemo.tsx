"use client";

import { useMemo } from "react";
import { useDemoBar } from "@/hooks/useDemoBar";
import { useDemoBottles, useMakeablePreview } from "@/hooks/queries/useMakeablePreview";
import { Shelves } from "./ShelfRow";
import { TonightMenu } from "./TonightMenu";
import { deriveShelfState, exampleIdsFrom, UNREACHABLE_COPY } from "./shelf-state";

export function ShelfDemo({ sharedIds }: { sharedIds?: string[] }) {
  const bottlesQuery = useDemoBottles();
  const bottles = bottlesQuery.data;
  const exampleIds = useMemo(() => exampleIdsFrom(bottles ?? []), [bottles]);
  const { ids, toggle, isExample, isShared } = useDemoBar(exampleIds, sharedIds);
  const previewQuery = useMakeablePreview(ids);

  const state = deriveShelfState({
    bottles,
    bottlesStatus: bottlesQuery.status,
    ids,
    isExample,
    isShared,
    preview: previewQuery.data,
    previewError: previewQuery.isError,
    previewFetching: previewQuery.isFetching,
  });

  return (
    <section
      id="shelf"
      className="mx-auto flex max-w-[1240px] flex-col gap-12 px-6 pb-[104px] pt-24 md:px-12"
    >
      <div className="flex max-w-[620px] flex-col gap-3">
        <h2 className="m-0 font-headline text-[46px] font-normal leading-[1.1] tracking-[-0.01em]">
          What&apos;s on your shelf?
        </h2>
        <p className="m-0 text-[17px] leading-[27px] text-fg-secondary">
          Tap the bottles you have at home. Your menu for tonight updates as you go.
        </p>
      </div>
      {state.view === "error" ? (
        <p role="alert" className="m-0 text-[15px] text-fg-secondary">
          {UNREACHABLE_COPY}
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-14">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
            {state.view === "loading" ? (
              <div aria-busy="true" className="flex flex-col gap-7">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-[260px] animate-pulse rounded-md bg-surface-muted" />
                ))}
              </div>
            ) : (
              <>
                <Shelves bottles={bottles ?? []} pressedIds={ids} onToggle={toggle} />
                <span className="text-[13px] text-fg-muted">{state.hint}</span>
              </>
            )}
          </div>
          <TonightMenu
            preview={state.view === "ready" ? state.menu.preview : undefined}
            awaiting={state.view === "loading" || (state.view === "ready" && state.menu.awaiting)}
            dimmed={state.view === "ready" && state.menu.dimmed}
            error={state.view === "ready" && state.menu.error}
            ids={ids}
          />
        </div>
      )}
    </section>
  );
}
