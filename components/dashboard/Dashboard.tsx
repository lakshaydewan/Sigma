"use client";

import React, { useMemo, useState, useTransition } from "react";

import { createDesign } from "@/app/actions/designs";
import type { DesignSummary } from "@/lib/designs";
import { FigmaLogo, PlusIcon, SearchIcon } from "@/components/icons";
import DesignCard from "./DesignCard";

function NewDesignButton({ subtle }: { subtle?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void createDesign())}
      className={
        subtle
          ? `flex h-8 items-center gap-1.5 rounded-figma bg-figma-blue px-3 text-ui-lg font-medium
             text-white transition-colors hover:bg-figma-blue-hover disabled:opacity-60`
          : `flex h-7 items-center gap-1.5 rounded-figma bg-figma-blue px-2.5 text-ui-lg font-medium
             text-white transition-colors hover:bg-figma-blue-hover disabled:opacity-60`
      }
    >
      <PlusIcon size={13} />
      {pending ? "Creating…" : "New design"}
    </button>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-figma border border-dashed
      border-figma-border-strong bg-white/60 px-6 py-20 text-center">
      {/* A phone outline: what a new design starts life as. */}
      <svg width="52" height="76" viewBox="0 0 52 76" fill="none" aria-hidden>
        <rect x="0.75" y="0.75" width="50.5" height="74.5" rx="8" stroke="#d9d9d9" strokeWidth="1.5" />
        <rect x="8" y="12" width="36" height="20" rx="4" fill="#e9e9e9" />
        <rect x="8" y="38" width="24" height="5" rx="2.5" fill="#ececec" />
        <rect x="8" y="48" width="36" height="5" rx="2.5" fill="#ececec" />
        <rect x="8" y="58" width="30" height="5" rx="2.5" fill="#ececec" />
      </svg>

      <h2 className="mt-5 text-ui-xl font-semibold text-figma-text">
        {searching ? "No designs match that" : "No designs yet"}
      </h2>
      <p className="mt-1 max-w-[34ch] text-ui-lg leading-5 text-figma-text-secondary">
        {searching
          ? "Try a different name."
          : "Every new design opens on a mobile screen you can take apart."}
      </p>

      {!searching && (
        <div className="mt-5">
          <NewDesignButton subtle />
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ designs }: { designs: DesignSummary[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return designs;

    return designs.filter((design) => design.name.toLowerCase().includes(needle));
  }, [designs, query]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-figma-canvas">
      {/* The same toolbar as the editor, so the two feel like one product. */}
      <header className="relative z-10 flex h-10 shrink-0 select-none items-center gap-2.5 bg-figma-toolbar
        px-3 text-figma-on-dark">
        <FigmaLogo size={18} />
        <span className="text-ui-lg font-medium">Drafts</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <SearchIcon
              size={13}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2
                text-figma-on-dark-secondary"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search designs"
              aria-label="Search designs"
              className="h-7 w-56 rounded-figma bg-figma-toolbar-hover pl-7 pr-2 text-ui-lg text-white
                placeholder:text-figma-on-dark-secondary focus:outline-none focus:ring-1
                focus:ring-figma-blue"
            />
          </div>

          <NewDesignButton />
        </div>
      </header>

      <main className="fig-scroll flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-7 sm:px-8">
          <div className="mb-5">
            <h1 className="text-[19px] font-semibold leading-6 tracking-[-0.01em] text-figma-text">
              Recents
            </h1>
            <p className="mt-1 text-ui-lg text-figma-text-secondary">
              {designs.length === 0
                ? "Nothing saved yet"
                : `${designs.length} design${designs.length === 1 ? "" : "s"} · anyone with the link can edit`}
            </p>
          </div>

          {visible.length === 0 ? (
            <EmptyState searching={query.trim().length > 0} />
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(216px,1fr))] gap-x-5 gap-y-7">
              {visible.map((design) => (
                <DesignCard key={design.id} design={design} />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
