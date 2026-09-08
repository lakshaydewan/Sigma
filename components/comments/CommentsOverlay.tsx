import React, { useEffect, useState } from "react";
import { useThreads } from "@liveblocks/react/suspense";

import { ActiveElement } from "@/types/type";
import { defaultNavElement } from "@/constants";
import { screenToCanvas } from "@/lib/canvas";
import NewThread from "./NewThread";
import PinnedThread from "./PinnedThread";

type Props = {
  activeElement: ActiveElement;
  setActiveElement: (element: ActiveElement) => void;
  viewport: number[];
};

/** Where a new comment is being written: canvas anchor plus its on-screen spot. */
type Draft = {
  canvas: { x: number; y: number };
  screen: { x: number; y: number };
};

export default function CommentsOverlay({
  activeElement,
  setActiveElement,
  viewport,
}: Props) {
  const { threads } = useThreads();

  // Threads deleted through the pin are flagged rather than removed — see PinnedThread.
  const visibleThreads = threads.filter((thread) => !thread.metadata.deleted);
  const [draft, setDraft] = useState<Draft | null>(null);

  const isPlacingComment = activeElement?.value === "comments";

  const closeComposer = () => {
    setDraft(null);
    setActiveElement(defaultNavElement);
  };

  // Escape leaves comment mode instead of stranding the user in a crosshair cursor.
  useEffect(() => {
    if (!isPlacingComment) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !draft) setActiveElement(defaultNavElement);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlacingComment, draft, setActiveElement]);

  return (
    <>
      {visibleThreads.map((thread) => (
        <PinnedThread key={thread.id} thread={thread} viewport={viewport} />
      ))}

      {isPlacingComment && (
        <>
          <div
            className="absolute inset-0 z-40 h-full w-full cursor-crosshair"
            onClick={(e) => {
              const { left, top } = e.currentTarget.getBoundingClientRect();
              const screen = { x: e.clientX - left, y: e.clientY - top };
              const canvasPoint = screenToCanvas(screen.x, screen.y, viewport);

              // Anchor to the canvas so the pin travels with the artwork when panning.
              setDraft({ screen, canvas: { x: canvasPoint.x, y: canvasPoint.y } });
            }}
          />
          {!draft && (
            <p
              className="pointer-events-none absolute bottom-6 left-1/2 z-40 -translate-x-1/2
                whitespace-nowrap rounded-figma bg-figma-menu px-2.5 py-1.5 text-ui text-white
                shadow-figma-menu"
            >
              Click anywhere to leave a comment
              <span className="ml-2 text-figma-on-dark-secondary">Esc to cancel</span>
            </p>
          )}
        </>
      )}

      {draft && (
        <NewThread
          screenX={draft.screen.x}
          screenY={draft.screen.y}
          x={draft.canvas.x}
          y={draft.canvas.y}
          onClose={closeComposer}
        />
      )}
    </>
  );
}
