import React from "react";
import { Composer } from "@liveblocks/react-ui";

import { useMaxZIndex } from "@/lib/useMaxZIndex";

type Props = {
  /** Canvas-space anchor, stored on the thread. */
  x: number;
  y: number;
  /** Where to draw the composer right now. */
  screenX: number;
  screenY: number;
  onClose: () => void;
};

export default function NewThread({ x, y, screenX, screenY, onClose }: Props) {
  const maxZIndex = useMaxZIndex();

  return (
    <div
      className="fig-pop absolute z-50 w-72 overflow-hidden rounded-figma bg-figma-panel shadow-figma-menu"
      style={{ left: screenX, top: screenY, ["--fig-pop-origin" as string]: "top left" }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
      }}
      onPointerMove={(e) => e.stopPropagation()}
    >
      <Composer
        autoFocus
        onComposerSubmit={() => onClose()}
        metadata={{ x, y, resolved: false, zIndex: maxZIndex + 1 }}
      />
    </div>
  );
}
