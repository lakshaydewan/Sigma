import React from "react";

import { FigmaLogo, PlusIcon, SearchIcon } from "@/components/icons";

const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-figma-sm bg-figma-border ${className}`} />
);

/**
 * The file browser before the list arrives. The toolbar is the real one rather
 * than a placeholder — it never changes once the designs load, so drawing it
 * immediately makes the page feel like it is already open.
 */
export default function DashboardSkeleton() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-figma-canvas">
      <header className="relative z-10 flex h-10 shrink-0 select-none items-center gap-2.5
        bg-figma-toolbar px-3 text-figma-on-dark">
        <FigmaLogo size={18} />
        <span className="text-ui-lg font-medium">Drafts</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <SearchIcon
              size={13}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2
                text-figma-on-dark-secondary"
            />
            <div className="h-7 w-56 rounded-figma bg-figma-toolbar-hover pl-7 pr-2 text-ui-lg
              leading-7 text-figma-on-dark-secondary">
              Search designs
            </div>
          </div>

          <div className="flex h-7 items-center gap-1.5 rounded-figma bg-figma-blue px-2.5 text-ui-lg
            font-medium text-white opacity-70">
            <PlusIcon size={13} />
            New design
          </div>
        </div>
      </header>

      <main className="fig-scroll flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-7 sm:px-8">
          <div className="mb-5">
            <h1 className="text-[19px] font-semibold leading-6 tracking-[-0.01em] text-figma-text">
              Recents
            </h1>
            <Bar className="mt-2 h-2.5 w-52" />
          </div>

          <ul className="grid grid-cols-[repeat(auto-fill,minmax(216px,1fr))] gap-x-5 gap-y-7">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i}>
                <div className="aspect-[4/3] animate-pulse rounded-figma border border-figma-border
                  bg-figma-panel" />
                <div className="mt-2 px-1.5">
                  <Bar className="h-3 w-3/5" />
                  <Bar className="mt-2 h-2.5 w-2/5" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
