import { fabric } from "fabric";

/** Corner radii in the order [topLeft, topRight, bottomRight, bottomLeft]. */
export type CornerRadii = [number, number, number, number];

export const NO_RADII: CornerRadii = [0, 0, 0, 0];

/** Reads the four radii off a rect, falling back to its uniform rx. */
export const cornerRadiiOf = (object: any): CornerRadii => {
  if (Array.isArray(object?.cornerRadii) && object.cornerRadii.length === 4) {
    return object.cornerRadii.map((r: unknown) => Number(r) || 0) as CornerRadii;
  }

  const uniform = Number(object?.rx) || 0;
  return [uniform, uniform, uniform, uniform];
};

/**
 * fabric.Rect only knows a single rx/ry, so it can't round corners
 * independently — the control every designer expects. Swap in a renderer that
 * reads a `cornerRadii` tuple and leave the rest of Rect (controls, hit
 * testing, serialisation) alone.
 */
export const installRoundedRectRenderer = () => {
  const proto = fabric.Rect.prototype as any;
  if (proto.__roundedCornersInstalled) return;
  proto.__roundedCornersInstalled = true;

  proto.cornerRadii = NO_RADII;

  // So fabric invalidates its cached bitmap when the radii change, and so a
  // radius edit counts as a state change for object:modified.
  proto.cacheProperties = proto.cacheProperties.concat("cornerRadii", "scaleX", "scaleY");
  proto.stateProperties = proto.stateProperties.concat("cornerRadii");

  // Keep the radii on copy/paste and on every serialisation, not just the
  // storage sync that names them explicitly.
  const baseToObject = proto.toObject;
  proto.toObject = function (propertiesToInclude?: string[]) {
    return baseToObject.call(this, ["cornerRadii"].concat(propertiesToInclude ?? []));
  };

  proto._render = function (ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;
    const x = -w / 2;
    const y = -h / 2;

    /**
     * fabric draws the shape through a context already scaled by the object's
     * scaleX/scaleY, so a plain circular corner stretches with the shape while a
     * resize handle is being dragged. Dividing each radius by the axis scale and
     * drawing an ellipse in local space makes the painted corner circular at any
     * scale — which is what Figma shows. Canvas zoom is deliberately not
     * compensated: the whole design should scale when you zoom.
     */
    const sx = Math.abs(this.scaleX) || 1;
    const sy = Math.abs(this.scaleY) || 1;

    // A corner can never eat more than half the shorter side, measured on screen.
    const limit = Math.min(Math.abs(w) * sx, Math.abs(h) * sy) / 2;
    const [tl, tr, br, bl] = cornerRadiiOf(this).map((r) =>
      Math.max(0, Math.min(r, limit))
    );

    // local (pre-scale) radii
    let axTL = tl / sx, ayTL = tl / sy;
    let axTR = tr / sx, ayTR = tr / sy;
    let axBR = br / sx, ayBR = br / sy;
    let axBL = bl / sx, ayBL = bl / sy;

    // Two large radii sharing an edge would overlap; shrink them all by the same
    // factor, the way CSS border-radius resolves the same conflict.
    const ratio = (length: number, sum: number) => (sum > 0 ? length / sum : Infinity);
    const fit = Math.min(
      1,
      ratio(Math.abs(w), axTL + axTR),
      ratio(Math.abs(w), axBL + axBR),
      ratio(Math.abs(h), ayTL + ayBL),
      ratio(Math.abs(h), ayTR + ayBR)
    );

    if (fit < 1) {
      axTL *= fit; ayTL *= fit;
      axTR *= fit; ayTR *= fit;
      axBR *= fit; ayBR *= fit;
      axBL *= fit; ayBL *= fit;
    }

    const HALF_PI = Math.PI / 2;

    ctx.beginPath();
    ctx.moveTo(x + axTL, y);

    ctx.lineTo(x + w - axTR, y);
    if (axTR > 0 || ayTR > 0) {
      ctx.ellipse(x + w - axTR, y + ayTR, axTR, ayTR, 0, -HALF_PI, 0);
    }

    ctx.lineTo(x + w, y + h - ayBR);
    if (axBR > 0 || ayBR > 0) {
      ctx.ellipse(x + w - axBR, y + h - ayBR, axBR, ayBR, 0, 0, HALF_PI);
    }

    ctx.lineTo(x + axBL, y + h);
    if (axBL > 0 || ayBL > 0) {
      ctx.ellipse(x + axBL, y + h - ayBL, axBL, ayBL, 0, HALF_PI, Math.PI);
    }

    ctx.lineTo(x, y + ayTL);
    if (axTL > 0 || ayTL > 0) {
      ctx.ellipse(x + axTL, y + ayTL, axTL, ayTL, 0, Math.PI, Math.PI + HALF_PI);
    }

    ctx.closePath();

    this._renderPaintInOrder(ctx);
  };
};
