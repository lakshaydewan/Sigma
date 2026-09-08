import React, { useEffect, useRef } from "react";

import { CursorChatProps, CursorMode } from "@/types/type";
import CursorSVG from "@/public/assets/CursorSVG";

export default function CursorChat({
  cursor,
  cursorState,
  setCursorState,
  updateMyPresence,
}: CursorChatProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    updateMyPresence({ message: value });

    if (cursorState.mode === CursorMode.Chat) {
      setCursorState({ ...cursorState, message: value });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" || e.key === "Enter") {
      setCursorState({ mode: CursorMode.Hidden });
      updateMyPresence({ message: "" });
    }
  };

  const message = cursorState.mode === CursorMode.Chat ? cursorState.message : "";

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-40"
      style={{ transform: `translateX(${cursor.x}px) translateY(${cursor.y}px)` }}
    >
      <CursorSVG color="#0d99ff" />

      <div
        className="pointer-events-auto absolute left-4 top-4 flex items-center rounded-figma
          rounded-tl-none bg-figma-blue px-2.5 py-1.5 shadow-figma-pin"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="w-52 border-none bg-transparent text-ui-lg leading-4 text-white outline-none
            placeholder:text-white/60"
          autoFocus
          value={message}
          placeholder="Say something…"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <kbd className="ml-2 shrink-0 rounded-figma-sm bg-white/20 px-1 text-[10px] leading-4 text-white/90">
          esc
        </kbd>
      </div>
    </div>
  );
}
