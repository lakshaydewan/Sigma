import React from "react";

import { LiveCursorProps } from "@/types/type";
import Cursor from "./Cursor";

export default function LiveCursors({ others }: LiveCursorProps) {
  return (
    <>
      {others.map(({ connectionId, presence }) => {
        if (!presence?.cursor) return null;

        return (
          <Cursor
            key={connectionId}
            color={presence.cursorColor}
            x={presence.cursor.x}
            y={presence.cursor.y}
            name={presence.username}
            message={presence.message}
          />
        );
      })}
    </>
  );
}
