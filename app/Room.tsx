"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { LiveMap } from "@liveblocks/client";

import { COLORS } from "@/constants";
import { generateRandomName } from "@/lib/utils";
import EditorSkeleton from "@/components/skeletons/EditorSkeleton";

export function Room({
  children,
  roomId,
  name,
}: {
  children: ReactNode;
  roomId: string;
  name: string;
}) {
  return (
    <LiveblocksProvider publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!}>
      <RoomProvider
        id={roomId}
        initialPresence={() => ({
          cursor: null,
          cursorColor: COLORS[Math.floor(Math.random() * COLORS.length)],
          editingText: false,
          message: "",
          username: generateRandomName(),
        })}
        initialStorage={() => ({
          canvasObjects: new LiveMap(),
        })}
      >
        <ClientSideSuspense fallback={<EditorSkeleton name={name} />}>{children}</ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
