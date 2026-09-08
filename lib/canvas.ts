import { fabric } from "fabric";
import { v4 as uuid4 } from "uuid";

import {
  Attributes,
  CanvasMouseDown,
  CanvasMouseMove,
  CanvasMouseUp,
  CanvasObjectModified,
  CanvasObjectScaling,
  CanvasPathCreated,
  CanvasSelectionCreated,
  CustomFabricObject,
  RenderCanvas,
} from "@/types/type";
import { defaultNavElement } from "@/constants";
import {
  applyClickSize,
  clearDragOrigin,
  createSpecificShape,
  dragOriginOf,
  MIN_DRAG,
  nextZIndex,
  setDragOrigin,
} from "./shapes";
import { cornerRadiiOf, installRoundedRectRenderer } from "./rounded-rect";

/** An unpanned, unzoomed viewport. */
export const IDENTITY_VIEWPORT = [1, 0, 0, 1, 0, 0];

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const ZOOM_STEP = 0.002;

/** Figma's canvas ground. Re-applied after every clear(), which resets it. */
export const CANVAS_BACKGROUND = "#f5f5f5";

// initialize fabric canvas
export const initializeFabric = ({
  fabricRef,
  canvasRef,
}: {
  fabricRef: React.MutableRefObject<fabric.Canvas | null>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) => {
  // get canvas element
  const canvasElement = document.getElementById("canvas");

  installRoundedRectRenderer();

  // Selection chrome, matched to Figma: a 1px blue outline with small square handles.
  fabric.Object.prototype.set({
    borderColor: "#0d99ff",
    borderScaleFactor: 1.5,
    cornerColor: "#ffffff",
    cornerStrokeColor: "#0d99ff",
    cornerStyle: "rect",
    cornerSize: 8,
    transparentCorners: false,
    padding: 0,
    // Stroke weight is absolute in Figma — it doesn't grow when a shape is scaled.
    strokeUniform: true,
  });

  // Figma has no rotation stalk; rotation lives in the design panel instead.
  fabric.Object.prototype.setControlsVisibility({ mtr: false });

  // create fabric canvas
  const canvas = new fabric.Canvas(canvasRef.current, {
    width: canvasElement?.clientWidth,
    height: canvasElement?.clientHeight,
    backgroundColor: CANVAS_BACKGROUND,
    selectionColor: "rgba(13, 153, 255, 0.08)",
    selectionBorderColor: "#0d99ff",
    selectionLineWidth: 1,
    // clicking a shape shouldn't reorder it, the way it doesn't in Figma
    preserveObjectStacking: true,
    uniformScaling: false,
  });

  canvas.freeDrawingBrush.color = "#1e1e1e";
  canvas.freeDrawingBrush.width = 4;

  // set canvas reference to fabricRef so we can use it later anywhere outside canvas listener
  fabricRef.current = canvas;

  return canvas;
};

// instantiate creation of custom fabric object/shape and add it to canvas
export const handleCanvasMouseDown = ({
  options,
  canvas,
  selectedShapeRef,
  isDrawing,
  shapeRef,
}: CanvasMouseDown) => {
  // get pointer coordinates
  const pointer = canvas.getPointer(options.e);

  /**
   * get target object i.e., the object that is clicked
   * findtarget() returns the object that is clicked
   *
   * findTarget: http://fabricjs.com/docs/fabric.Canvas.html#findTarget
   */
  const target = canvas.findTarget(options.e, false);

  // set canvas drawing mode to false
  canvas.isDrawingMode = false;

  // if selected shape is freeform, set drawing mode to true and return
  if (selectedShapeRef.current === "freeform") {
    isDrawing.current = true;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.width = 5;
    return;
  }

  canvas.isDrawingMode = false;

  // if target is the selected shape or active selection, set isDrawing to false
  if (
    target &&
    (target.type === selectedShapeRef.current ||
      target.type === "activeSelection")
  ) {
    isDrawing.current = false;

    // set active object to target
    canvas.setActiveObject(target);

    /**
     * setCoords() is used to update the controls of the object
     * setCoords: http://fabricjs.com/docs/fabric.Object.html#setCoords
     */
    target.setCoords();
  } else {
    isDrawing.current = true;

    // create custom fabric object/shape and set it to shapeRef
    shapeRef.current = createSpecificShape(
      selectedShapeRef.current,
      pointer as any
    );

    // if shapeRef is not null, add it to canvas
    if (shapeRef.current) {
      // The drag is measured from here, so a drag in any direction works and a
      // click — a drag of no length — can be told apart on mouse up.
      setDragOrigin(shapeRef.current, { x: pointer.x, y: pointer.y });

      // add: http://fabricjs.com/docs/fabric.Canvas.html#add
      canvas.add(shapeRef.current);
    }
  }
};

// handle mouse move event on canvas to draw shapes with different dimensions
export const handleCanvaseMouseMove = ({
  options,
  canvas,
  isDrawing,
  selectedShapeRef,
  shapeRef,
  syncShapeInStorage,
}: CanvasMouseMove) => {
  // if selected shape is freeform, return
  if (!isDrawing.current) return;
  if (selectedShapeRef.current === "freeform") return;

  canvas.isDrawingMode = false;

  const shape = shapeRef.current;
  if (!shape) return;

  // get pointer coordinates
  const pointer = canvas.getPointer(options.e);

  // The shape being drawn is the box between where the drag started and the
  // pointer, so dragging up or left works the same as dragging down or right.
  const origin = dragOriginOf(shape);
  const left = Math.min(origin.x, pointer.x);
  const top = Math.min(origin.y, pointer.y);
  const width = Math.abs(pointer.x - origin.x);
  const height = Math.abs(pointer.y - origin.y);

  switch (selectedShapeRef?.current) {
    case "rectangle":
    case "triangle":
    case "image":
      shape.set({ left, top, width, height });
      break;

    case "circle":
      // a fabric circle only has one radius, so the longer axis of the drag wins
      shape.set({ left, top, radius: Math.max(width, height) / 2 } as Partial<fabric.Circle>);
      break;

    case "line":
      shape.set({ x2: pointer.x, y2: pointer.y } as Partial<fabric.Line>);
      break;

    default:
      break;
  }

  // render objects on canvas
  // renderAll: http://fabricjs.com/docs/fabric.Canvas.html#renderAll
  canvas.renderAll();

  // sync shape in storage
  if ((shape as CustomFabricObject<fabric.Object>).objectId) {
    syncShapeInStorage(shape);
  }
};

// handle mouse up event on canvas to stop drawing shapes
export const handleCanvasMouseUp = ({
  canvas,
  isDrawing,
  shapeRef,
  activeObjectRef,
  selectedShapeRef,
  syncShapeInStorage,
  setActiveElement,
}: CanvasMouseUp) => {
  isDrawing.current = false;
  if (selectedShapeRef.current === "freeform") return;

  if (shapeRef.current) {
    // A click never resized the shape, so give it its default size rather than
    // storing an empty one.
    applyClickSize(shapeRef.current, MIN_DRAG / canvas.getZoom());
    clearDragOrigin(shapeRef.current);
    shapeRef.current.setCoords();
    canvas.requestRenderAll();
  }

  // sync shape in storage as drawing is stopped
  syncShapeInStorage(shapeRef.current);

  // set everything to null
  shapeRef.current = null;
  activeObjectRef.current = null;
  selectedShapeRef.current = null;

  // if canvas is not in drawing mode, set active element to default nav element after 700ms
  if (!canvas.isDrawingMode) {
    setTimeout(() => {
      setActiveElement(defaultNavElement);
    }, 700);
  }
};

// update shape in storage when object is modified
export const handleCanvasObjectModified = ({
  options,
  syncShapeInStorage,
}: CanvasObjectModified) => {
  const target = options.target;
  if (!target) return;

  // Dragging a rect's handles changes its scale, which would stretch the corner
  // radii with it. Figma keeps radii absolute, so fold the scale back into the
  // dimensions and leave the shape at scale 1.
  if (target.type === "rect" && (target.scaleX !== 1 || target.scaleY !== 1)) {
    target.set({
      width: (target.width ?? 0) * (target.scaleX ?? 1),
      height: (target.height ?? 0) * (target.scaleY ?? 1),
      scaleX: 1,
      scaleY: 1,
    });
    target.setCoords();
  }

  if (target?.type == "activeSelection") {
    // fix this
  } else {
    syncShapeInStorage(target);
  }
};

// update shape in storage when path is created when in freeform mode
export const handlePathCreated = ({
  options,
  syncShapeInStorage,
}: CanvasPathCreated) => {
  // get path object
  const path = options.path;
  if (!path) return;

  // set unique id and stacking order on the path object
  path.set({
    objectId: uuid4(),
    zIndex: nextZIndex(),
  });

  // sync shape in storage
  syncShapeInStorage(path);
};

// Objects are free to move anywhere on the canvas — clamping them to the viewport
// would fight panning, since the visible region is no longer the whole canvas.
export const handleCanvasObjectMoving = ({
  options,
  setElementAttributes,
}: {
  options: fabric.IEvent;
  setElementAttributes?: React.Dispatch<React.SetStateAction<Attributes>>;
}) => {
  const target = options.target as fabric.Object;
  if (!target) return;

  target.setCoords();

  // Figma updates X/Y live as you drag. Returning the previous object when the
  // rounded values haven't changed keeps this from re-rendering on every mousemove.
  setElementAttributes?.((prev) => {
    const x = (target.left ?? 0).toFixed(0);
    const y = (target.top ?? 0).toFixed(0);

    return prev.x === x && prev.y === y ? prev : { ...prev, x, y };
  });
};

/** A blank design panel: no selection, nothing to show. */
export const DEFAULT_ATTRIBUTES: Attributes = {
  x: "",
  y: "",
  width: "",
  height: "",
  angle: "",
  cornerRadius: "",
  cornerRadii: ["0", "0", "0", "0"],
  flipX: false,
  flipY: false,
  opacity: "",
  blendMode: "source-over",
  fill: "",
  stroke: "",
  strokeWidth: "",
  strokeStyle: "solid",
  shadowEnabled: false,
  shadowColor: "#00000040",
  shadowBlur: "4",
  shadowOffsetX: "0",
  shadowOffsetY: "4",
  fontSize: "",
  fontFamily: "",
  fontWeight: "",
  textAlign: "left",
  lineHeight: "",
  charSpacing: "",
  underline: false,
  linethrough: false,
};

/** Reads every property the design panel edits off a fabric object. */
export const readAttributes = (element: fabric.Object): Attributes => {
  const scaledWidth = element.width! * (element.scaleX ?? 1);
  const scaledHeight = element.height! * (element.scaleY ?? 1);
  const shadow = element.shadow as fabric.Shadow | null;
  const dash = element.strokeDashArray;
  const anyElement = element as any;
  const radii = cornerRadiiOf(anyElement);
  const cornersMatch = radii.every((r) => r === radii[0]);

  return {
    x: (element.left ?? 0).toFixed(0),
    y: (element.top ?? 0).toFixed(0),
    width: scaledWidth.toFixed(0),
    height: scaledHeight.toFixed(0),
    angle: (element.angle ?? 0).toFixed(0),
    cornerRadius: cornersMatch ? String(radii[0]) : "",
    cornerRadii: radii.map(String),
    flipX: Boolean(element.flipX),
    flipY: Boolean(element.flipY),

    opacity: (element.opacity ?? 1).toString(),
    blendMode: element.globalCompositeOperation || "source-over",

    fill: element.fill?.toString() || "",
    stroke: element.stroke || "",
    strokeWidth: (element.strokeWidth ?? 0).toString(),
    strokeStyle: !dash || dash.length === 0 ? "solid" : dash[0] <= 2 ? "dot" : "dash",

    shadowEnabled: Boolean(shadow),
    shadowColor: shadow?.color || "#00000040",
    shadowBlur: (shadow?.blur ?? 4).toString(),
    shadowOffsetX: (shadow?.offsetX ?? 0).toString(),
    shadowOffsetY: (shadow?.offsetY ?? 4).toString(),

    fontSize: (anyElement.fontSize ?? "").toString(),
    fontFamily: anyElement.fontFamily ?? "",
    fontWeight: (anyElement.fontWeight ?? "").toString(),
    textAlign: anyElement.textAlign ?? "left",
    lineHeight: (anyElement.lineHeight ?? 1.16).toString(),
    charSpacing: (anyElement.charSpacing ?? 0).toString(),
    underline: Boolean(anyElement.underline),
    linethrough: Boolean(anyElement.linethrough),
  };
};

// set element attributes when element is selected
export const handleCanvasSelectionCreated = ({
  options,
  isEditingRef,
  setElementAttributes,
}: CanvasSelectionCreated) => {
  // if user is editing manually, return
  if (isEditingRef.current) return;

  // if no element is selected, return
  if (!options?.selected) return;

  // get the selected element
  const selectedElement = options?.selected[0] as fabric.Object;

  // if only one element is selected, set element attributes
  if (selectedElement && options.selected.length === 1) {
    setElementAttributes(readAttributes(selectedElement));
  }
};

// update element attributes when element is scaled
export const handleCanvasObjectScaling = ({
  options,
  setElementAttributes,
}: CanvasObjectScaling) => {
  const selectedElement = options.target;

  // calculate scaled dimensions of the object
  const scaledWidth = selectedElement?.scaleX
    ? selectedElement?.width! * selectedElement?.scaleX
    : selectedElement?.width;

  const scaledHeight = selectedElement?.scaleY
    ? selectedElement?.height! * selectedElement?.scaleY
    : selectedElement?.height;

  setElementAttributes((prev) => ({
    ...prev,
    width: scaledWidth?.toFixed(0).toString() || "",
    height: scaledHeight?.toFixed(0).toString() || "",
  }));
};

/** Re-reads everything once a drag, scale or rotate finishes. */
export const handleCanvasObjectModifiedAttributes = ({
  options,
  isEditingRef,
  setElementAttributes,
}: {
  options: fabric.IEvent;
  isEditingRef: React.MutableRefObject<boolean>;
  setElementAttributes: React.Dispatch<React.SetStateAction<Attributes>>;
}) => {
  const target = options.target;
  if (!target || target.type === "activeSelection" || isEditingRef.current) return;

  setElementAttributes(readAttributes(target));
};

// render canvas objects coming from storage on canvas
export const renderCanvas = ({
  fabricRef,
  canvasObjects,
  activeObjectRef,
}: RenderCanvas) => {
  // clear canvas — clear() also drops the background colour, so put it back
  fabricRef.current?.clear();
  if (fabricRef.current) fabricRef.current.backgroundColor = CANVAS_BACKGROUND;

  // Storage is a map, so draw order comes from an explicit zIndex rather than
  // insertion order — otherwise "bring to front" is lost on the next sync.
  const ordered = Array.from(canvasObjects as Map<string, any>).sort(
    (a, b) => (a[1]?.zIndex ?? 0) - (b[1]?.zIndex ?? 0)
  );

  // render all objects on canvas
  ordered.map(([objectId, objectData]) => {
    /**
     * enlivenObjects() is used to render objects on canvas.
     * It takes two arguments:
     * 1. objectData: object data to render on canvas
     * 2. callback: callback function to execute after rendering objects
     * on canvas
     *
     * enlivenObjects: http://fabricjs.com/docs/fabric.util.html#.enlivenObjectEnlivables
     */
    fabric.util.enlivenObjects(
      [objectData],
      (enlivenedObjects: fabric.Object[]) => {
        enlivenedObjects.forEach((enlivenedObj) => {
          // if element is active, keep it in active state so that it can be edited further
          if (activeObjectRef.current?.objectId === objectId) {
            fabricRef.current?.setActiveObject(enlivenedObj);
          }

          // add object to canvas
          fabricRef.current?.add(enlivenedObj);
        });
      },
      /**
       * specify namespace of the object for fabric to render it on canvas
       * A namespace is a string that is used to identify the type of
       * object.
       *
       * Fabric Namespace: http://fabricjs.com/docs/fabric.html
       */
      "fabric"
    );
  });

  fabricRef.current?.renderAll();
};

// resize canvas dimensions on window resize
export const handleResize = ({ canvas }: { canvas: fabric.Canvas | null }) => {
  const canvasElement = document.getElementById("canvas");
  if (!canvasElement) return;

  if (!canvas) return;

  canvas.setDimensions({
    width: canvasElement.clientWidth,
    height: canvasElement.clientHeight,
  });
};

// Pan on wheel, zoom on modifier + wheel — the convention in Figma and Excalidraw.
export const handleCanvasZoom = ({
  options,
  canvas,
}: {
  options: fabric.IEvent & { e: WheelEvent };
  canvas: fabric.Canvas;
}) => {
  const event = options.e;

  if (!event.ctrlKey && !event.metaKey) {
    // Trackpads report deltaX; a plain wheel only reports deltaY, so it scrolls vertically.
    canvas.relativePan(new fabric.Point(-event.deltaX, -event.deltaY));
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  let zoom = canvas.getZoom();
  zoom = Math.min(Math.max(MIN_ZOOM, zoom - event.deltaY * ZOOM_STEP), MAX_ZOOM);

  // zoomToPoint keeps the point under the cursor fixed while scaling
  canvas.zoomToPoint({ x: event.offsetX, y: event.offsetY }, zoom);

  event.preventDefault();
  event.stopPropagation();
};

/** Screen (canvas-element) coordinates -> canvas-space coordinates. */
export const screenToCanvas = (x: number, y: number, viewport: number[]) =>
  fabric.util.transformPoint(new fabric.Point(x, y), fabric.util.invertTransform(viewport));

/** Canvas-space coordinates -> screen (canvas-element) coordinates. */
export const canvasToScreen = (x: number, y: number, viewport: number[]) =>
  fabric.util.transformPoint(new fabric.Point(x, y), viewport);
