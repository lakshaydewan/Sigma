import { fabric } from "fabric";
import { v4 as uuidv4 } from "uuid";

import {
  CustomFabricObject,
  ElementDirection,
  ImageUpload,
  ModifyShape,
} from "@/types/type";

/** The size a shape gets when its tool is clicked rather than dragged out. */
export const DEFAULT_SHAPE_SIZE = 100;

/**
 * A drag shorter than this (in screen pixels) is a click, not a drag — the
 * shape it draws would otherwise end up with no size at all.
 */
export const MIN_DRAG = 4;

/** Where the current drag started, remembered on the shape while it is drawn. */
type DragOrigin = { x: number; y: number };

export const setDragOrigin = (shape: fabric.Object, origin: DragOrigin) => {
  (shape as any).__dragOrigin = origin;
};

export const dragOriginOf = (shape: fabric.Object): DragOrigin =>
  (shape as any).__dragOrigin ?? { x: shape.left ?? 0, y: shape.top ?? 0 };

export const clearDragOrigin = (shape: fabric.Object) => {
  delete (shape as any).__dragOrigin;
};

export const createRectangle = (pointer: PointerEvent) => {
  const rect = new fabric.Rect({
    left: pointer.x,
    top: pointer.y,
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    fill: "#d9d9d9",
    cornerRadii: [0, 0, 0, 0],
    objectId: uuidv4(),
  } as CustomFabricObject<fabric.Rect>);

  return rect;
};

export const createTriangle = (pointer: PointerEvent) => {
  return new fabric.Triangle({
    left: pointer.x,
    top: pointer.y,
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    fill: "#d9d9d9",
    objectId: uuidv4(),
  } as CustomFabricObject<fabric.Triangle>);
};

export const createCircle = (pointer: PointerEvent) => {
  return new fabric.Circle({
    left: pointer.x,
    top: pointer.y,
    radius: DEFAULT_SHAPE_SIZE / 2,
    fill: "#d9d9d9",
    objectId: uuidv4(),
  } as any);
};

export const createLine = (pointer: PointerEvent) => {
  return new fabric.Line(
    [pointer.x, pointer.y, pointer.x + DEFAULT_SHAPE_SIZE, pointer.y],
    {
      stroke: "#1e1e1e",
      strokeWidth: 2,
      objectId: uuidv4(),
    } as CustomFabricObject<fabric.Line>
  );
};

export const createText = (pointer: PointerEvent, text: string) => {
  return new fabric.IText(text, {
    left: pointer.x,
    top: pointer.y,
    fill: "#1e1e1e",
    fontFamily: "Inter",
    fontSize: 36,
    fontWeight: "400",
    objectId: uuidv4()
  } as fabric.ITextOptions);
};

/**
 * Stacking order is stored per shape. Seeding from the clock keeps newly drawn
 * shapes above existing ones across clients; the counter keeps objects created
 * in the same millisecond (a multi-object paste) distinct.
 */
let zCounter = Date.now();
export const nextZIndex = () => ++zCounter;

export const createSpecificShape = (
  shapeType: string,
  pointer: PointerEvent
) => {
  const shape = buildShape(shapeType, pointer);

  // Stacking order is stored, not implied by insertion order — see renderCanvas.
  if (shape) (shape as any).zIndex = nextZIndex();

  return shape;
};

const buildShape = (shapeType: string, pointer: PointerEvent) => {
  switch (shapeType) {
    case "rectangle":
      return createRectangle(pointer);

    case "triangle":
      return createTriangle(pointer);

    case "circle":
      return createCircle(pointer);

    case "line":
      return createLine(pointer);

    case "text":
      return createText(pointer, "Type something");

    default:
      return null;
  }
};

/**
 * Clicking with a shape tool is a zero-length drag, which would leave the shape
 * with no size at all. Figma drops a default-sized shape on a click instead, so
 * give anything that was never dragged out its default dimensions.
 *
 * `minDrag` is in canvas units, so the caller scales it by the current zoom.
 */
export const applyClickSize = (shape: fabric.Object, minDrag: number) => {
  if (shape.type === "line") {
    const line = shape as fabric.Line;
    const dx = (line.x2 ?? 0) - (line.x1 ?? 0);
    const dy = (line.y2 ?? 0) - (line.y1 ?? 0);
    if (Math.hypot(dx, dy) >= minDrag) return;

    // A horizontal line — the length is what the click is missing, not an angle.
    line.set({ x2: (line.x1 ?? 0) + DEFAULT_SHAPE_SIZE, y2: line.y1 ?? 0 });
    return;
  }

  if (shape.type === "circle") {
    const circle = shape as fabric.Circle;
    if ((circle.radius ?? 0) * 2 >= minDrag) return;

    circle.set({ radius: DEFAULT_SHAPE_SIZE / 2 });
    return;
  }

  // A deliberate drag can be thin in one axis, so only a shape that stayed small
  // in both counts as a click.
  const width = (shape.width ?? 0) * (shape.scaleX ?? 1);
  const height = (shape.height ?? 0) * (shape.scaleY ?? 1);
  if (width >= minDrag || height >= minDrag) return;

  shape.set({
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    scaleX: 1,
    scaleY: 1,
  });
};

export const handleImageUpload = ({
  file,
  canvas,
  shapeRef,
  syncShapeInStorage,
}: ImageUpload) => {
  const reader = new FileReader();

  reader.onload = () => {
    fabric.Image.fromURL(reader.result as string, (img) => {
      img.scaleToWidth(200);
      img.scaleToHeight(200);

      canvas.current.add(img);

      // @ts-ignore
      img.objectId = uuidv4();
      // @ts-ignore
      img.zIndex = nextZIndex();

      shapeRef.current = img;

      syncShapeInStorage(img);
      canvas.current.requestRenderAll();
    });
  };

  reader.readAsDataURL(file);
};

export const createShape = (
  canvas: fabric.Canvas,
  pointer: PointerEvent,
  shapeType: string
) => {
  if (shapeType === "freeform") {
    canvas.isDrawingMode = true;
    return null;
  }

  return createSpecificShape(shapeType, pointer);
};

/** Dash patterns for the stroke style control, scaled to the stroke weight. */
const strokeDash = (style: string, weight: number): number[] | undefined => {
  const w = Math.max(weight, 1);
  if (style === "dash") return [w * 4, w * 3];
  if (style === "dot") return [1, w * 3];
  return undefined;
};

export const modifyShape = ({
  canvas,
  property,
  value,
  activeObjectRef,
  syncShapeInStorage,
}: ModifyShape) => {
  const selectedElement = canvas?.getActiveObject();

  if (!selectedElement || selectedElement?.type === "activeSelection") return;

  switch (property) {
    // width/height are stored unscaled, so reset the scale before setting them
    case "width":
      selectedElement.set({ scaleX: 1, width: value });
      break;

    case "height":
      selectedElement.set({ scaleY: 1, height: value });
      break;

    case "x":
      selectedElement.set({ left: value });
      break;

    case "y":
      selectedElement.set({ top: value });
      break;

    case "cornerRadii": {
      const radii = value as number[];
      // rx/ry are kept in step so a uniform radius still round-trips through
      // anything that only understands fabric's own single-radius model.
      selectedElement.set({
        cornerRadii: radii,
        rx: radii[0],
        ry: radii[0],
        dirty: true,
      } as Partial<fabric.Object>);
      break;
    }

    case "strokeStyle": {
      const dash = strokeDash(value, selectedElement.strokeWidth ?? 1);
      selectedElement.set({
        strokeDashArray: dash,
        strokeLineCap: value === "dot" ? "round" : "butt",
      });
      break;
    }

    case "strokeWidth":
      selectedElement.set({
        strokeWidth: value,
        // keep an existing dash pattern proportional to the new weight
        strokeDashArray: selectedElement.strokeDashArray?.length
          ? strokeDash(
              selectedElement.strokeDashArray[0] <= 2 ? "dot" : "dash",
              value
            )
          : selectedElement.strokeDashArray,
      });
      break;

    case "blendMode":
      selectedElement.set({ globalCompositeOperation: value });
      break;

    case "shadow":
      selectedElement.set({ shadow: value ? new fabric.Shadow(value) : undefined });
      break;

    default:
      if (selectedElement[property as keyof object] === value) return;
      selectedElement.set(property as keyof object, value);
  }

  selectedElement.setCoords();

  // set selectedElement to activeObjectRef
  activeObjectRef.current = selectedElement;

  syncShapeInStorage(selectedElement);
};

export const bringElement = ({
  canvas,
  direction,
  syncShapeInStorage,
}: ElementDirection) => {
  if (!canvas) return;

  const selectedElement = canvas.getActiveObject();

  if (!selectedElement || selectedElement?.type === "activeSelection") return;

  const zOf = (object: fabric.Object) => (object as any).zIndex ?? 0;
  const others = canvas.getObjects().filter((object) => object !== selectedElement);
  const zIndexes = others.map(zOf);

  if (direction === "front") {
    (selectedElement as any).zIndex = Math.max(0, ...zIndexes) + 1;
    canvas.bringToFront(selectedElement);
  } else if (direction === "back") {
    (selectedElement as any).zIndex = Math.min(0, ...zIndexes) - 1;
    canvas.sendToBack(selectedElement);
  }

  canvas.requestRenderAll();
  syncShapeInStorage(selectedElement);
};
