import React from "react";

type Props = {
  label: string;
  shortcut?: string;
  side?: "bottom" | "top" | "left";
  children: React.ReactNode;
};

const sideClasses = {
  bottom: "left-1/2 top-full mt-2 -translate-x-1/2",
  top: "left-1/2 bottom-full mb-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
} as const;

/**
 * Figma's tooltip: dark card, 11px, shortcut trailing in grey, and a delay long
 * enough that it never fires while you're just passing over the toolbar.
 */
export default function Tooltip({ label, shortcut, side = "bottom", children }: Props) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-[100] flex items-center gap-1.5 whitespace-nowrap
          rounded-figma bg-figma-menu px-2 py-1 text-ui text-white opacity-0 shadow-figma-menu
          transition-opacity duration-75 group-hover/tooltip:opacity-100 group-hover/tooltip:delay-500
          ${sideClasses[side]}`}
      >
        {label}
        {shortcut && <span className="text-figma-on-dark-secondary">{shortcut}</span>}
      </span>
    </span>
  );
}
