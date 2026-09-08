import { fabric } from "fabric";

import { IDENTITY_VIEWPORT } from "./canvas";

/** The most a stored preview is allowed to measure, in pixels. */
const MAX_WIDTH = 480;
const MAX_HEIGHT = 360;

/** Breathing room around the design, in canvas units. */
const PADDING = 24;

/**
 * A JPEG data URL of everything on the canvas, cropped to its contents.
 *
 * fabric crops in screen space, so the shot is taken with the viewport reset:
 * the preview should show the design, not wherever the person was last looking.
 */
export const captureThumbnail = (canvas: fabric.Canvas): string | null => {
  const objects = canvas.getObjects();
  if (objects.length === 0) return null;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const object of objects) {
    // absolute: the bounds shouldn't move with the viewport.
    const box = object.getBoundingRect(true, true);

    left = Math.min(left, box.left);
    top = Math.min(top, box.top);
    right = Math.max(right, box.left + box.width);
    bottom = Math.max(bottom, box.top + box.height);
  }

  const width = right - left + PADDING * 2;
  const height = bottom - top + PADDING * 2;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const viewport = canvas.viewportTransform
    ? [...canvas.viewportTransform]
    : [...IDENTITY_VIEWPORT];

  canvas.setViewportTransform([...IDENTITY_VIEWPORT]);

  try {
    return canvas.toDataURL({
      format: "jpeg",
      quality: 0.7,
      left: left - PADDING,
      top: top - PADDING,
      width,
      height,
      multiplier: Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, 1),
      enableRetinaScaling: false,
    });
  } catch {
    // A canvas holding a cross-origin image is tainted and can't be exported.
    return null;
  } finally {
    canvas.setViewportTransform(viewport);
    canvas.requestRenderAll();
  }
};
