import React, { useEffect, useMemo, useState } from "react";
import { RoomProvider, useOthers, useMyPresence } from "@liveblocks/react";
import Cursor from "./cursor/Cursor";
import { handleKeyDown } from "@/lib/key-events";

/**
 * This file shows how to add basic live cursors on your product.
 */

const COLORS = [
  "#E57373",
  "#9575CD",
  "#4FC3F7",
  "#81C784",
  "#FFF176",
  "#FF8A65",
  "#F06292",
  "#7986CB",
];

export default function Live() {

  const [state, setState] = useState(false);

  const handleOnChange = (e: any)=> {
    e.target.focus();
      updateMyPresence(
        {cursor: {
        message: e.target.value
      }})
  }

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Enter") { // event.code for "/"
        setState(true);
        console.log("Enter key pressed");
      }
      if (event.key === "Escape") {
        console.log("escape pressed!")
        setState(false)
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyPress);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);
  /**
   * useMyPresence returns the presence of the current user and a function to update it.
   * updateMyPresence is different than the setState function returned by the useState hook from React.
   * You don't need to pass the full presence object to update it.
   * See https://liveblocks.io/docs/api-reference/liveblocks-react#useMyPresence for more information
   */
  const [{ cursor }, updateMyPresence]: any = useMyPresence();

  /**
   * Return all the other users in the room and their presence (a cursor position in this case)
   */
  const others = useOthers();

  return (
    <main
      className={"w-screen h-screen border border-white"}
      onPointerMove={(event) => {
        // Update the user cursor position on every pointer move
        updateMyPresence({
          cursor: {
            x: Math.round(event.clientX),
            y: Math.round(event.clientY),
          },
        });
      }}
      onPointerLeave={() =>
        // When the pointer goes out, set cursor to null
        updateMyPresence({
          cursor: null,
        })
      }
    >
      <div>
        {cursor
          ? (
            <div>
              {`${cursor.x} × ${cursor.y}`} {
            state && (
              <input
              onChange={handleOnChange}
              type="text"
              placeholder="Type here ..."
              autoFocus
              style={{
                transform: `translateX(${cursor.x + 20}px) translateY(${cursor.y + 20}px)`
              }}
              className={`bg-white focus:cursor-zoom-in px-2 rounded-lg text-black outline-none ring-0 border-[3px] border-gray-500 absolute top-0 left-0`}>
              </input>
            )
          }
            </div>
          )
          : "Move your cursor to broadcast its position to other people in the room."}
      </div>

      {
        /**
         * Iterate over other users and display a cursor based on their presence
         */
        others.map(({ connectionId, presence }) => {
          if (presence.cursor === null || presence === null || presence === undefined) {
            return null
          }

          return (
              <Cursor
              key={`cursor-${connectionId}`}
              // connectionId is an integer that is incremented at every new connections
              // Assigning a color with a modulo makes sure that a specific user has the same colors on every clients
              color={COLORS[connectionId % COLORS.length]}
              x={presence.cursor.x}
              y={presence.cursor.y}
              message={presence.cursor.message}
            />
          );
        })
      }
    </main>
  );
}

