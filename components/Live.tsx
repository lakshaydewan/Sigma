import React, { useCallback, useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import {
  useBroadcastEvent,
  useEventListener,
  useMyPresence,
  useOthers,
} from "@liveblocks/react/suspense";

import useInterval from "@/hooks/useInterval";
import {
  ActiveElement,
  Attributes,
  CursorMode,
  CursorState,
  CustomFabricObject,
  Reaction,
  Selection,
} from "@/types/type";
import {
  handleCanvaseMouseMove,
  handleCanvasMouseDown,
  handleCanvasMouseUp,
  handleCanvasObjectModified,
  handleCanvasObjectModifiedAttributes,
  handleCanvasObjectMoving,
  handleCanvasObjectScaling,
  handleCanvasSelectionCreated,
  handleCanvasZoom,
  handlePathCreated,
  handleResize,
  DEFAULT_ATTRIBUTES,
  IDENTITY_VIEWPORT,
  initializeFabric,
  renderCanvas,
} from "@/lib/canvas";
import { handleKeyDown } from "@/lib/key-events";
import { navElements, shapeElements, toolShortcuts } from "@/constants";
import LiveCursors from "./cursor/LiveCursors";
import CursorChat from "./cursor/CursorChat";
import ReactionSelector from "./reactions/ReactionSelector";
import FlyingReaction from "./reactions/FlyingReaction";
import CommentsOverlay from "./comments/CommentsOverlay";

/** Every selectable tool, keyed by its `value`, so a shortcut can look one up. */
const toolsByValue: Record<string, ActiveElement> = {};
[...navElements, ...shapeElements].forEach((element) => {
  if (typeof element.value === "string") {
    toolsByValue[element.value] = element as ActiveElement;
  }
});

type Props = {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  fabricRef: React.MutableRefObject<fabric.Canvas | null>;
  isDrawing: React.MutableRefObject<boolean>;
  shapeRef: React.MutableRefObject<fabric.Object | null>;
  selectedShapeRef: React.MutableRefObject<string | null>;
  activeObjectRef: React.MutableRefObject<fabric.Object | null>;
  isEditingRef: React.MutableRefObject<boolean>;
  activeElement: ActiveElement;
  setActiveElement: (element: ActiveElement) => void;
  handleActiveElement: (element: ActiveElement) => void;
  setElementAttributes: React.Dispatch<React.SetStateAction<Attributes>>;
  setSelection: (selection: Selection) => void;
  setZoom: (zoom: number | "in" | "out") => void;
  undo: () => void;
  redo: () => void;
  syncShapeInStorage: (shape: fabric.Object) => void;
  deleteShapeFromStorage: (id: string) => void;
  canvasObjects: ReadonlyMap<string, any>;
};

export default function Live({
  canvasRef,
  fabricRef,
  isDrawing,
  shapeRef,
  selectedShapeRef,
  activeObjectRef,
  isEditingRef,
  activeElement,
  setActiveElement,
  handleActiveElement,
  setElementAttributes,
  setSelection,
  setZoom,
  undo,
  redo,
  syncShapeInStorage,
  deleteShapeFromStorage,
  canvasObjects,
}: Props) {
  const [{ cursor }, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const broadcast = useBroadcastEvent();

  const [cursorState, setCursorState] = useState<CursorState>({
    mode: CursorMode.Hidden,
  });
  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Comment pins live in canvas space, so they need the current viewport transform.
  const [viewport, setViewport] = useState<number[]>(IDENTITY_VIEWPORT);
  const viewportRef = useRef<number[]>(IDENTITY_VIEWPORT);

  // Space-drag / middle-drag panning
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const isSpaceHeldRef = useRef(false);
  const panFromRef = useRef<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // renderCanvas() clears the canvas to redraw from storage; the events that fires
  // are a redraw, not the user changing the selection.
  const isRenderingRef = useRef(false);

  // The canvas listeners are wired once on mount, so read the latest callbacks
  // through a ref rather than re-registering them on every render.
  const latest = useRef({ handleActiveElement, setZoom, setSelection });
  useEffect(() => {
    latest.current = { handleActiveElement, setZoom, setSelection };
  });

  // periodically clear out expired flying reactions
  useInterval(() => {
    setReactions((prev) => prev.filter((r) => Date.now() - r.timestamp < 4000));
  }, 1000);

  // while a reaction is "pressed", keep dropping + broadcasting new ones
  useInterval(() => {
    if (cursorState.mode === CursorMode.Reaction && cursorState.isPressed && cursor) {
      setReactions((prev) =>
        prev.concat([
          {
            point: { x: cursor.x, y: cursor.y },
            value: cursorState.reaction,
            timestamp: Date.now(),
          },
        ])
      );

      broadcast({ x: cursor.x, y: cursor.y, value: cursorState.reaction });
    }
  }, 100);

  useEventListener(({ event }) => {
    setReactions((prev) =>
      prev.concat([
        { point: { x: event.x, y: event.y }, value: event.value, timestamp: Date.now() },
      ])
    );
  });

  // mount the fabric canvas and wire up every canvas event once
  useEffect(() => {
    const canvas = initializeFabric({ canvasRef, fabricRef });

    const trackSelection = (options: any) => {
      const selected = options?.selected?.[0] as CustomFabricObject<fabric.Object> | undefined;
      activeObjectRef.current = selected ?? null;
      latest.current.setSelection(
        selected?.objectId ? { id: selected.objectId, type: selected.type ?? "" } : null
      );
    };

    canvas.on("mouse:down", (options: any) => {
      const event = options.e as MouseEvent;

      // Hold space or use the middle button to grab the canvas and pan it.
      if (isSpaceHeldRef.current || event.button === 1) {
        panFromRef.current = { x: event.clientX, y: event.clientY };
        canvas.selection = false;
        setIsPanning(true);
        return;
      }

      handleCanvasMouseDown({ options, canvas, selectedShapeRef, isDrawing, shapeRef });
    });

    canvas.on("mouse:move", (options: any) => {
      const event = options.e as MouseEvent;

      if (panFromRef.current) {
        canvas.relativePan(
          new fabric.Point(
            event.clientX - panFromRef.current.x,
            event.clientY - panFromRef.current.y
          )
        );
        panFromRef.current = { x: event.clientX, y: event.clientY };
        return;
      }

      handleCanvaseMouseMove({
        options,
        canvas,
        isDrawing,
        selectedShapeRef,
        shapeRef,
        syncShapeInStorage,
      });
    });

    canvas.on("mouse:up", () => {
      if (panFromRef.current) {
        panFromRef.current = null;
        canvas.selection = true;
        setIsPanning(false);
        return;
      }

      handleCanvasMouseUp({
        canvas,
        isDrawing,
        shapeRef,
        activeObjectRef,
        selectedShapeRef,
        syncShapeInStorage,
        setActiveElement,
      });
    });

    canvas.on("path:created", (options: any) => {
      handlePathCreated({ options, syncShapeInStorage });
    });

    canvas.on("object:modified", (options: any) => {
      handleCanvasObjectModified({ options, syncShapeInStorage });
      handleCanvasObjectModifiedAttributes({ options, isEditingRef, setElementAttributes });
    });

    canvas.on("object:moving", (options: any) => {
      handleCanvasObjectMoving({ options, setElementAttributes });
    });

    canvas.on("object:scaling", (options: any) => {
      handleCanvasObjectScaling({ options, setElementAttributes });
    });

    canvas.on("selection:created", (options: any) => {
      trackSelection(options);
      handleCanvasSelectionCreated({ options, isEditingRef, setElementAttributes });
    });

    canvas.on("selection:updated", (options: any) => {
      trackSelection(options);
      handleCanvasSelectionCreated({ options, isEditingRef, setElementAttributes });
    });

    canvas.on("selection:cleared", () => {
      if (isRenderingRef.current) return;

      activeObjectRef.current = null;
      latest.current.setSelection(null);
      if (!isEditingRef.current) setElementAttributes(DEFAULT_ATTRIBUTES);
    });

    canvas.on("mouse:wheel", (options: any) => {
      handleCanvasZoom({ options, canvas });
      latest.current.setZoom(canvas.getZoom());
    });

    // One place to notice any viewport change — wheel pan, space drag, or the
    // zoom control in the toolbar — without each of them reporting separately.
    canvas.on("after:render", () => {
      const next = canvas.viewportTransform;
      if (!next || next.every((value, i) => value === viewportRef.current[i])) return;

      viewportRef.current = [...next];
      setViewport(viewportRef.current);
    });

    // Canvas text is measured at draw time, so repaint once Inter has loaded.
    document.fonts?.ready.then(() => fabricRef.current?.requestRenderAll());

    const onResize = () => handleResize({ canvas: fabricRef.current });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      canvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-render canvas contents whenever shared storage changes
  useEffect(() => {
    isRenderingRef.current = true;
    renderCanvas({ fabricRef, canvasObjects, activeObjectRef });
    isRenderingRef.current = false;

    // If the selected object is gone from storage, someone else deleted it.
    const activeId = (activeObjectRef.current as CustomFabricObject<fabric.Object> | null)
      ?.objectId;

    if (activeId && !canvasObjects.has(activeId)) {
      activeObjectRef.current = null;
      setSelection(null);
      setElementAttributes(DEFAULT_ATTRIBUTES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasObjects, fabricRef, activeObjectRef]);

  // keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      const hasModifier = e.metaKey || e.ctrlKey || e.altKey;

      if (!isTyping && !isEditingRef.current) {
        const key = e.key.toLowerCase();

        if (e.code === "Space") {
          e.preventDefault();
          isSpaceHeldRef.current = true;
          setIsSpaceHeld(true);
          return;
        }

        if (e.key === "/" && !hasModifier) {
          e.preventDefault();
          setCursorState({ mode: CursorMode.Chat, previousMessage: null, message: "" });
        } else if (e.key === "Escape") {
          updateMyPresence({ message: "" });
          setCursorState({ mode: CursorMode.Hidden });
          fabricRef.current?.discardActiveObject();
          fabricRef.current?.requestRenderAll();
        } else if (key === "e" && !hasModifier) {
          setCursorState({ mode: CursorMode.ReactionSelector });
        } else if (!hasModifier && toolShortcuts[key]) {
          latest.current.handleActiveElement(toolsByValue[toolShortcuts[key]]);
        } else if (!hasModifier && (e.key === "+" || e.key === "=")) {
          e.preventDefault();
          latest.current.setZoom("in");
        } else if (!hasModifier && (e.key === "-" || e.key === "_")) {
          e.preventDefault();
          latest.current.setZoom("out");
        } else if (e.shiftKey && e.code === "Digit0") {
          e.preventDefault();
          latest.current.setZoom(1);
        }
      }

      handleKeyDown({
        e,
        canvas: fabricRef.current,
        undo,
        redo,
        syncShapeInStorage,
        deleteShapeFromStorage,
      });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      isSpaceHeldRef.current = false;
      setIsSpaceHeld(false);
    };

    // Releasing space outside the window would otherwise leave pan mode stuck on.
    const onBlur = () => {
      isSpaceHeldRef.current = false;
      setIsSpaceHeld(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const { left, top } = e.currentTarget.getBoundingClientRect();
      updateMyPresence({ cursor: { x: e.clientX - left, y: e.clientY - top } });
    },
    [updateMyPresence]
  );

  const handlePointerLeave = useCallback(() => {
    setCursorState({ mode: CursorMode.Hidden });
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  const handlePointerDown = useCallback(() => {
    setCursorState((state) =>
      state.mode === CursorMode.Reaction ? { ...state, isPressed: true } : state
    );
  }, []);

  const handlePointerUp = useCallback(() => {
    setCursorState((state) =>
      state.mode === CursorMode.Reaction ? { ...state, isPressed: false } : state
    );
  }, []);

  const setReaction = useCallback((reaction: string) => {
    setCursorState({ mode: CursorMode.Reaction, reaction, isPressed: false });
  }, []);

  const isDrawingTool =
    activeElement?.value !== "select" && activeElement?.value !== "comments";

  const panClass = isPanning ? "fig-panning" : isSpaceHeld ? "fig-pan-ready" : "";

  return (
    <div
      id="canvas"
      className={`relative h-full w-full flex-1 overflow-hidden bg-figma-canvas ${panClass} ${
        isDrawingTool ? "cursor-crosshair" : "cursor-default"
      }`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} />

      {reactions.map((r) => (
        <FlyingReaction
          key={r.timestamp}
          x={r.point.x}
          y={r.point.y}
          timestamp={r.timestamp}
          value={r.value}
        />
      ))}

      {cursor && cursorState.mode === CursorMode.Chat && (
        <CursorChat
          cursor={cursor}
          cursorState={cursorState}
          setCursorState={setCursorState}
          updateMyPresence={updateMyPresence}
        />
      )}

      {cursorState.mode === CursorMode.ReactionSelector && (
        <ReactionSelector setReaction={setReaction} />
      )}

      <LiveCursors others={others} />

      <CommentsOverlay
        activeElement={activeElement}
        setActiveElement={setActiveElement}
        viewport={viewport}
      />
    </div>
  );
}
