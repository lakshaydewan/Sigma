import React from "react";

import { FigmaLogo } from "@/components/icons";

/** A placeholder block, sized in whatever units the caller needs. */
const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-figma-sm bg-figma-border ${className}`} />
);

const DarkBar = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-figma-sm bg-white/10 ${className}`} />
);

const LayerRow = ({ width }: { width: string }) => (
  <div className="flex h-7 items-center gap-2 px-2">
    <Bar className="h-3.5 w-3.5 shrink-0" />
    <Bar className="h-2.5" />
    <div style={{ width }} />
  </div>
);

/**
 * The editor's chrome, drawn before the canvas can be. Both the route's loading
 * state and the room's connection fallback render this, so opening a design goes
 * straight to this frame and stays on it until the design itself appears —
 * rather than flashing through two different waiting screens.
 */
export default function EditorSkeleton({ name }: { name?: string }) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-figma-canvas">
      {/* toolbar */}
      <nav className="relative z-10 flex h-10 shrink-0 items-center bg-figma-toolbar px-1">
        <div className="flex h-10 w-12 items-center justify-center gap-1">
          <FigmaLogo size={18} />
        </div>

        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <DarkBar key={i} className="h-5 w-5" />
          ))}
        </div>

        <div className="absolute left-1/2 hidden -translate-x-1/2 sm:block">
          <DarkBar className="h-3 w-28" />
        </div>

        <div className="ml-auto flex items-center gap-2 pr-2">
          <DarkBar className="h-6 w-6 rounded-full" />
          <DarkBar className="h-7 w-16 rounded-figma" />
          <DarkBar className="h-3 w-9" />
        </div>
      </nav>

      <section className="flex flex-1 overflow-hidden">
        {/* layers panel */}
        <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-figma-border
          bg-figma-panel md:flex">
          <div className="border-b border-figma-border px-2 py-2.5">
            <Bar className="h-3 w-24" />
          </div>
          <div className="px-2 py-2">
            <Bar className="mb-2 ml-2 h-2.5 w-12" />
            {["70%", "45%", "60%", "35%", "55%", "40%"].map((width, i) => (
              <LayerRow key={i} width={width} />
            ))}
          </div>
        </aside>

        {/* canvas */}
        <div className="relative flex flex-1 items-center justify-center bg-figma-canvas">
          <p className="animate-pulse text-ui text-figma-text-secondary">
            {name ? `Opening ${name}…` : "Opening…"}
          </p>
        </div>

        {/* design panel */}
        <aside className="hidden h-full w-60 shrink-0 flex-col border-l border-figma-border
          bg-figma-panel md:flex">
          {[3, 2, 4].map((rows, section) => (
            <div key={section} className="border-b border-figma-border px-3 py-3">
              <Bar className="mb-3 h-2.5 w-16" />
              <div className="grid grid-cols-2 gap-1.5">
                {Array.from({ length: rows * 2 }).map((_, i) => (
                  <Bar key={i} className="h-6" />
                ))}
              </div>
            </div>
          ))}
        </aside>
      </section>
    </div>
  );
}
