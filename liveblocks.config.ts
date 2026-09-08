// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
import { LiveMap } from "@liveblocks/client";
import { ReactionEvent } from "@/types/type";

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null;
      cursorColor: string;
      editingText: boolean;
      message: string;
      username: string;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      canvasObjects: LiveMap<string, any>;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        // name: string;
        // avatar: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: ReactionEvent;

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      resolved: boolean;
      zIndex: number;
      x: number;
      y: number;
      time?: number;
      /** Soft delete — see the note in components/comments/PinnedThread.tsx. */
      deleted?: boolean;
    };

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: {
      // Example, rooms with a title and url
      // title: string;
      // url: string;
    };
  }
}

export {};
