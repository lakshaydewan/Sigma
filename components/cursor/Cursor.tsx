import React from "react";

import CursorSVG from "@/public/assets/CursorSVG";

type Props = {
  color: string;
  x: number;
  y: number;
  name?: string;
  message?: string;
};

/**
 * A collaborator's pointer: the arrow, a name tag in their presence colour, and
 * their cursor-chat message underneath when they're typing one.
 */
export default function Cursor({ color, x, y, name, message }: Props) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30 transition-transform duration-100 ease-linear"
      style={{ transform: `translateX(${x}px) translateY(${y}px)` }}
    >
      <CursorSVG color={color} />

      <div className="absolute left-4 top-4 flex flex-col items-start gap-1">
        {name && (
          <span
            className="whitespace-nowrap rounded-figma px-1.5 py-0.5 text-ui font-medium leading-4 text-white shadow-figma-pin"
            style={{ backgroundColor: color }}
          >
            {name}
          </span>
        )}

        {message && (
          <span
            className="max-w-[240px] whitespace-pre-wrap break-words rounded-figma rounded-tl-none px-2 py-1 text-ui leading-4 text-white shadow-figma-pin"
            style={{ backgroundColor: color }}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
