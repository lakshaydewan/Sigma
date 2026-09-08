import React, { useRef, useState } from "react";
import { Thread } from "@liveblocks/react-ui";
import { ThreadData } from "@liveblocks/client";
import { useDeleteThread, useEditThreadMetadata } from "@liveblocks/react/suspense";

import useDismiss from "@/hooks/useDismiss";
import { canvasToScreen } from "@/lib/canvas";
import Tooltip from "../Tooltip";
import { CloseIcon, CommentIcon, TrashIcon } from "../icons";

type Props = {
  thread: ThreadData;
  viewport: number[];
};

/** Past this many pixels a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 3;

/** A comment marker on the canvas: Figma's blue pin with a squared-off bottom-left corner. */
export default function PinnedThread({ thread, viewport }: Props) {
  const [open, setOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const editThreadMetadata = useEditThreadMetadata();
  const deleteThread = useDeleteThread();

  useDismiss(containerRef, open, () => setOpen(false));

  const replies = Math.max(thread.comments.length - 1, 0);
  const isResolved = Boolean(thread.metadata.resolved);
  const zoom = viewport[0] || 1;

  // The thread stores a canvas-space anchor; the pin is drawn wherever that lands on screen.
  const anchor = canvasToScreen(thread.metadata.x, thread.metadata.y, viewport);
  const left = anchor.x + (dragOffset?.x ?? 0);
  const top = anchor.y + (dragOffset?.y ?? 0);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pressRef.current = { x: event.clientX, y: event.clientY, moved: false };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const press = pressRef.current;
    if (!press) return;

    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;

    if (!press.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

    press.moved = true;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press) return;

    if (!press.moved) {
      setOpen((prev) => !prev);
      return;
    }

    // Screen pixels dragged become canvas units at the current zoom.
    editThreadMetadata({
      threadId: thread.id,
      metadata: {
        x: thread.metadata.x + (event.clientX - press.x) / zoom,
        y: thread.metadata.y + (event.clientY - press.y) / zoom,
      },
    });

    setDragOffset(null);
  };

  const handleDelete = () => {
    try {
      deleteThread(thread.id);
    } catch {
      // On a public API key the server gives every connection its own anonymous
      // user id, but the client compares against the literal string "anonymous",
      // so Liveblocks' "only the author may delete" check can never pass. Thread
      // metadata has no such guard, so flag it instead — the overlay filters
      // flagged threads out for everyone.
      editThreadMetadata({ threadId: thread.id, metadata: { deleted: true } });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`absolute ${isResolved && !open ? "opacity-50 hover:opacity-100" : ""}`}
      style={{ left, top, zIndex: thread.metadata.zIndex }}
      onPointerMove={(e) => e.stopPropagation()}
    >
      <Tooltip label={dragOffset ? "Drop to move" : "Drag to move"}>
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-expanded={open}
          aria-label={replies ? `Comment with ${replies} replies` : "Comment"}
          className={`relative flex h-7 w-7 touch-none items-center justify-center rounded-full
            rounded-bl-none bg-figma-blue text-white shadow-figma-pin transition-transform
            ${dragOffset ? "scale-110 cursor-grabbing" : "cursor-grab hover:scale-110"}`}
        >
          <CommentIcon size={15} />
          {replies > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center
                rounded-full bg-white px-1 text-[9px] font-semibold leading-none text-figma-blue
                shadow-figma-pin"
            >
              {replies}
            </span>
          )}
        </button>
      </Tooltip>

      {open && !dragOffset && (
        <div
          className="fig-pop absolute left-0 top-9 w-72 overflow-hidden rounded-figma bg-figma-panel shadow-figma-menu"
          style={{ ["--fig-pop-origin" as string]: "top left" }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-end gap-0.5 border-b border-figma-border px-1.5 py-1">
            <Tooltip label="Delete thread">
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Delete thread"
                className="flex h-6 w-6 items-center justify-center rounded-figma-sm
                  text-figma-text-secondary transition-colors hover:bg-figma-hover
                  hover:text-figma-danger"
              >
                <TrashIcon size={13} />
              </button>
            </Tooltip>
            <Tooltip label="Close">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close thread"
                className="flex h-6 w-6 items-center justify-center rounded-figma-sm
                  text-figma-text-secondary transition-colors hover:bg-figma-hover
                  hover:text-figma-text"
              >
                <CloseIcon size={13} />
              </button>
            </Tooltip>
          </div>

          <Thread thread={thread} />
        </div>
      )}
    </div>
  );
}
