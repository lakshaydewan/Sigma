"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import {
  useHistory,
  useMutation,
  useRedo,
  useStorage,
  useUndo,
} from "@liveblocks/react/suspense";

import { renameDesign, saveThumbnail } from "@/app/actions/designs";
import Live from "@/components/Live";
import Navbar from "@/components/Navbar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import { ActiveElement, Attributes, CustomFabricObject, Selection } from "@/types/type";
import { defaultNavElement } from "@/constants";
import { handleDelete } from "@/lib/key-events";
import {
  CANVAS_BACKGROUND,
  DEFAULT_ATTRIBUTES,
  handleResize,
  MAX_ZOOM,
  MIN_ZOOM,
} from "@/lib/canvas";
import { handleImageUpload } from "@/lib/shapes";
import {
  buildStarterDesign,
  STARTER_BOUNDS,
  STARTER_FRAME_ID,
} from "@/lib/starter-design";
import { captureThumbnail } from "@/lib/thumbnail";

/** Breathing room around the starter screen, and the most it is ever scaled up. */
const STARTER_PADDING = 64;
const STARTER_MAX_ZOOM = 0.9;

/** How long the canvas has to sit still before its preview is re-shot. */
const THUMBNAIL_DELAY = 3000;

type Props = {
  designId: string;
  initialName: string;
};

export default function Editor({ designId, initialName }: Props) {
  const [name, setName] = useState(initialName);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const isDrawing = useRef(false);
  const shapeRef = useRef<fabric.Object | null>(null);
  const selectedShapeRef = useRef<string | null>(null);
  const activeObjectRef = useRef<fabric.Object | null>(null);
  const isEditingRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [activeElement, setActiveElement] = useState<ActiveElement>(defaultNavElement);
  const [elementAttributes, setElementAttributes] =
    useState<Attributes>(DEFAULT_ATTRIBUTES);
  const [selection, setSelection] = useState<Selection>(null);
  const [zoom, setZoomLevel] = useState(1);

  const canvasObjects = useStorage((root) => root.canvasObjects);
  const undo = useUndo();
  const redo = useRedo();
  const history = useHistory();

  const syncShapeInStorage = useMutation(({ storage }, object: CustomFabricObject<fabric.Object>) => {
    if (!object || !object.objectId) return;

    const shapeData = object.toObject(["objectId", "zIndex", "cornerRadii"]);
    const objects = storage.get("canvasObjects");
    objects.set(object.objectId, shapeData);
  }, []);

  const deleteShapeFromStorage = useMutation(({ storage }, objectId: string) => {
    storage.get("canvasObjects").delete(objectId);
  }, []);

  const deleteAllShapes = useMutation(({ storage }) => {
    const objects = storage.get("canvasObjects");
    if (!objects || objects.size === 0) return;

    for (const key of Array.from(objects.keys())) {
      objects.delete(key);
    }
  }, []);

  /**
   * An empty room is a blank page: nothing to select, nothing to learn the tools
   * on. Lay down a starter screen instead — see lib/starter-design.ts.
   */
  const seedStarterDesign = useMutation(({ storage }) => {
    const objects = storage.get("canvasObjects");
    if (objects.size > 0) return false;

    for (const [objectId, shapeData] of buildStarterDesign()) {
      objects.set(objectId, shapeData);
    }

    return true;
  }, []);

  /** Centres the starter screen and zooms out far enough to show all of it. */
  const frameStarterDesign = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // The canvas takes its size when it mounts, which can be before the panels
    // either side of it have settled. Measure again, or the design gets centred
    // on a viewport that isn't the one on screen.
    handleResize({ canvas });

    const width = canvas.getWidth();
    const height = canvas.getHeight();

    const fit = Math.min(
      (width - STARTER_PADDING * 2) / STARTER_BOUNDS.width,
      (height - STARTER_PADDING * 2) / STARTER_BOUNDS.height,
      STARTER_MAX_ZOOM
    );
    const zoom = Math.min(Math.max(fit, MIN_ZOOM), MAX_ZOOM);

    canvas.setViewportTransform([
      zoom,
      0,
      0,
      zoom,
      width / 2 - (STARTER_BOUNDS.x + STARTER_BOUNDS.width / 2) * zoom,
      height / 2 - (STARTER_BOUNDS.y + STARTER_BOUNDS.height / 2) * zoom,
    ]);
    setZoomLevel(zoom);
  }, []);

  // Only on arrival. Clearing the canvas later is a deliberate act, and seeding
  // again on the next render would undo it.
  const seededRef = useRef(false);
  const hasStarterRef = useRef(false);

  // Which canvas has been framed — not *whether* one has. React mounts the editor
  // twice in development, and the second canvas needs framing of its own; framing
  // the first one only moves a canvas that has already been disposed.
  const framedRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;

      const seeded = seedStarterDesign();

      // The starter design is where the file begins, not an edit the user made,
      // so it shouldn't be sitting on the undo stack waiting to be reverted.
      if (seeded) history.clear();

      // The storage snapshot in this closure predates the seed, so remember what
      // the room ended up with rather than reading it again.
      hasStarterRef.current = seeded || canvasObjects.has(STARTER_FRAME_ID);
    }

    // The viewport isn't stored, so every visit reopens at the origin — frame the
    // screen again for as long as the file still has it.
    const canvas = fabricRef.current;
    if (!hasStarterRef.current || !canvas || framedRef.current === canvas) return;

    framedRef.current = canvas;
    frameStarterDesign();
  }, [seedStarterDesign, frameStarterDesign, history, canvasObjects]);

  // Named here rather than in generateMetadata: that would hold the first byte
  // back on a database round trip, and this keeps up with a rename for free.
  useEffect(() => {
    document.title = `${name} – Figma`;
  }, [name]);

  /**
   * The dashboard shows each design as it currently looks, so re-shoot the
   * canvas once the edits settle — including the ones other people make.
   */
  const isFirstSync = useRef(true);

  useEffect(() => {
    if (isFirstSync.current) {
      isFirstSync.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const thumbnail = captureThumbnail(canvas);
      if (thumbnail) void saveThumbnail(designId, thumbnail);
    }, THUMBNAIL_DELAY);

    return () => clearTimeout(timer);
  }, [canvasObjects, designId]);

  /** Zooms about the middle of the viewport, the way the toolbar control does in Figma. */
  const setZoom = useCallback((next: number | "in" | "out") => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const current = canvas.getZoom();
    const target = next === "in" ? current * 1.2 : next === "out" ? current / 1.2 : next;
    const clamped = Math.min(Math.max(target, MIN_ZOOM), MAX_ZOOM);

    canvas.zoomToPoint(
      new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2),
      clamped
    );
    setZoomLevel(clamped);
  }, []);

  const handleActiveElement = useCallback(
    (element: ActiveElement) => {
      setActiveElement(element);

      switch (element?.value) {
        case "reset":
          deleteAllShapes();
          fabricRef.current?.clear();
          // clear() also drops the background colour
          if (fabricRef.current) {
            fabricRef.current.backgroundColor = CANVAS_BACKGROUND;
            fabricRef.current.requestRenderAll();
          }
          setSelection(null);
          setElementAttributes(DEFAULT_ATTRIBUTES);
          setActiveElement(defaultNavElement);
          break;

        case "delete":
          handleDelete(fabricRef.current as fabric.Canvas, deleteShapeFromStorage);
          setSelection(null);
          setElementAttributes(DEFAULT_ATTRIBUTES);
          setActiveElement(defaultNavElement);
          break;

        case "image":
          imageInputRef.current?.click();
          break;

        default:
          selectedShapeRef.current = element?.value ?? null;
      }
    },
    [deleteAllShapes, deleteShapeFromStorage]
  );

  const handleRename = useCallback(
    (next: string) => {
      setName(next);
      void renameDesign(designId, next);
    },
    [designId]
  );

  const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleImageUpload({
      file,
      canvas: fabricRef as React.MutableRefObject<fabric.Canvas>,
      shapeRef,
      syncShapeInStorage,
    });

    e.target.value = "";
  };

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-figma-canvas">
      <Navbar
        fileName={name}
        onRename={handleRename}
        activeElement={activeElement}
        imageInputRef={imageInputRef}
        handleImageUpload={handleImageUploadChange}
        handleActiveElement={handleActiveElement}
        undo={undo}
        redo={redo}
        zoom={zoom}
        setZoom={setZoom}
      />

      <section className="flex h-full flex-1 flex-row overflow-hidden">
        <LeftSidebar
          allShapes={Array.from(canvasObjects)}
          fabricRef={fabricRef}
          selectedObjectId={selection?.id ?? null}
          syncShapeInStorage={syncShapeInStorage}
        />

        <Live
          canvasRef={canvasRef}
          fabricRef={fabricRef}
          isDrawing={isDrawing}
          shapeRef={shapeRef}
          selectedShapeRef={selectedShapeRef}
          activeObjectRef={activeObjectRef}
          isEditingRef={isEditingRef}
          activeElement={activeElement}
          setActiveElement={setActiveElement}
          handleActiveElement={handleActiveElement}
          setElementAttributes={setElementAttributes}
          setSelection={setSelection}
          setZoom={setZoom}
          undo={undo}
          redo={redo}
          syncShapeInStorage={syncShapeInStorage}
          deleteShapeFromStorage={deleteShapeFromStorage}
          canvasObjects={canvasObjects}
        />

        <RightSidebar
          elementAttributes={elementAttributes}
          setElementAttributes={setElementAttributes}
          fabricRef={fabricRef}
          activeObjectRef={activeObjectRef}
          isEditingRef={isEditingRef}
          syncShapeInStorage={syncShapeInStorage}
          selection={selection}
        />
      </section>
    </main>
  );
}
