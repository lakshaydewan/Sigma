import { fabric } from "fabric";

import { installRoundedRectRenderer } from "./rounded-rect";

/**
 * The screen a brand-new file opens on. An empty canvas gives a first-time user
 * nothing to react to, so the room is seeded with a real design instead — a
 * mobile wallet screen for a web3 app, built out of the same shapes the editor
 * draws, so every layer can be selected, restyled and moved like any other.
 */

/** Where the artboard sits in canvas space, and how big the device screen is. */
const FRAME = { x: 140, y: 32, width: 375, height: 812 };

/** Room above the frame for its name, the way Figma labels an artboard. */
const LABEL_SPACE = 32;

export const STARTER_FRAME_ID = "starter-frame";

/** What a first visit should have in view, label included. */
export const STARTER_BOUNDS = {
  x: FRAME.x,
  y: FRAME.y - LABEL_SPACE,
  width: FRAME.width,
  height: FRAME.height + LABEL_SPACE,
};

const C = {
  screen: "#0B0B13",
  surface: "#14141F",
  border: "#24243A",
  violet: "#6C4CFF",
  violetSoft: "#A78BFA",
  violetWash: "#D6CCFF",
  mint: "#35E0A1",
  amber: "#FFB020",
  coral: "#FF6B81",
  text: "#FFFFFF",
  muted: "#8A8AA8",
  onLight: "#06251A",
  translucent: "rgba(255, 255, 255, 0.16)",
  indicator: "#2E2E45",
};

type RectSpec = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  /** Uniform corner radius. */
  r?: number;
  stroke?: string;
};

type CircleSpec = { x: number; y: number; d: number; fill: string };

type TextSpec = {
  x: number;
  y: number;
  w: number;
  text: string;
  size: number;
  fill: string;
  weight?: number;
  align?: "left" | "center" | "right";
  spacing?: number;
};

/** Serialised shapes, keyed the way `syncShapeInStorage` keys them. */
export type StarterEntry = [string, any];

/**
 * Ids are fixed rather than random so that two clients opening the same empty
 * room at once write the same keys instead of two overlapping copies.
 */
export const buildStarterDesign = (): StarterEntry[] => {
  // The rounded-rect renderer reads `cornerRadii`; it is normally installed when
  // the canvas mounts, and installing it twice is a no-op.
  installRoundedRectRenderer();

  const entries: StarterEntry[] = [];

  // Small, ascending stacking values: everything drawn later sits above the
  // starter design, since new shapes take their zIndex from the clock.
  let z = 0;

  const push = (id: string, object: fabric.Object) => {
    const objectId = `starter-${id}`;

    (object as any).objectId = objectId;
    (object as any).zIndex = ++z;

    entries.push([objectId, object.toObject(["objectId", "zIndex", "cornerRadii"])]);
  };

  const rect = (id: string, spec: RectSpec) => {
    const r = spec.r ?? 0;

    push(
      id,
      new fabric.Rect({
        left: FRAME.x + spec.x,
        top: FRAME.y + spec.y,
        width: spec.w,
        height: spec.h,
        fill: spec.fill,
        // null, not undefined: this is serialised straight into shared storage
        stroke: spec.stroke ?? null,
        strokeWidth: spec.stroke ? 1 : 0,
        rx: r,
        ry: r,
        cornerRadii: [r, r, r, r],
      } as any)
    );
  };

  const circle = (id: string, spec: CircleSpec) => {
    push(
      id,
      new fabric.Circle({
        left: FRAME.x + spec.x,
        top: FRAME.y + spec.y,
        radius: spec.d / 2,
        fill: spec.fill,
      } as any)
    );
  };

  const text = (id: string, spec: TextSpec) => {
    push(
      id,
      new fabric.Textbox(spec.text, {
        left: FRAME.x + spec.x,
        top: FRAME.y + spec.y,
        width: spec.w,
        fontFamily: "Inter",
        fontSize: spec.size,
        fontWeight: String(spec.weight ?? 400),
        fill: spec.fill,
        textAlign: spec.align ?? "left",
        charSpacing: spec.spacing ?? 0,
        lineHeight: 1.2,
        splitByGrapheme: false,
      } as any)
    );
  };

  // Figma prints the frame's name just above the artboard.
  text("frame-name", {
    x: 0,
    y: -24,
    w: 240,
    text: "Wallet · iPhone 13",
    size: 12,
    fill: "#8f8f8f",
  });

  rect("frame", {
    x: 0,
    y: 0,
    w: FRAME.width,
    h: FRAME.height,
    r: 40,
    fill: C.screen,
    stroke: C.border,
  });

  // ── status bar ────────────────────────────────────────────────────────────
  text("status-time", {
    x: 24,
    y: 20,
    w: 60,
    text: "9:41",
    size: 13,
    weight: 600,
    fill: C.text,
  });
  rect("status-signal", { x: 300, y: 24, w: 15, h: 10, r: 2, fill: C.text });
  rect("status-battery-shell", {
    x: 322,
    y: 23,
    w: 29,
    h: 12,
    r: 4,
    fill: "rgba(255, 255, 255, 0.24)",
  });
  rect("status-battery-level", { x: 324, y: 25, w: 20, h: 8, r: 3, fill: C.text });

  // ── account header ────────────────────────────────────────────────────────
  circle("avatar", { x: 24, y: 66, d: 36, fill: C.violet });
  text("avatar-initials", {
    x: 24,
    y: 77,
    w: 36,
    text: "LD",
    size: 13,
    weight: 700,
    fill: C.text,
    align: "center",
  });
  text("account-label", {
    x: 72,
    y: 70,
    w: 180,
    text: "Connected",
    size: 11,
    fill: C.muted,
    spacing: 40,
  });
  text("account-address", {
    x: 72,
    y: 85,
    w: 180,
    text: "0x7F3a…9C2b",
    size: 15,
    weight: 600,
    fill: C.text,
  });
  rect("scan-button", {
    x: 315,
    y: 66,
    w: 36,
    h: 36,
    r: 12,
    fill: C.surface,
    stroke: C.border,
  });
  [
    ["scan-dot-1", 324, 75],
    ["scan-dot-2", 336, 75],
    ["scan-dot-3", 324, 87],
    ["scan-dot-4", 336, 87],
  ].forEach(([id, x, y]) =>
    rect(id as string, { x: x as number, y: y as number, w: 6, h: 6, r: 2, fill: C.muted })
  );

  // ── balance card ──────────────────────────────────────────────────────────
  rect("balance-card", { x: 24, y: 118, w: 327, h: 164, r: 28, fill: C.violet });
  text("balance-label", {
    x: 48,
    y: 146,
    w: 180,
    text: "Total balance",
    size: 12,
    fill: C.violetWash,
    spacing: 40,
  });
  text("balance-amount", {
    x: 48,
    y: 164,
    w: 260,
    text: "$12,480.36",
    size: 34,
    weight: 700,
    fill: C.text,
  });
  rect("network-chip", { x: 247, y: 142, w: 80, h: 28, r: 14, fill: C.translucent });
  text("network-name", {
    x: 247,
    y: 149,
    w: 80,
    text: "Ethereum",
    size: 11,
    weight: 600,
    fill: C.text,
    align: "center",
  });
  rect("change-pill", { x: 48, y: 218, w: 112, h: 32, r: 16, fill: C.translucent });
  text("change-value", {
    x: 48,
    y: 227,
    w: 112,
    text: "+4.82% today",
    size: 12,
    weight: 600,
    fill: C.text,
    align: "center",
  });

  // ── quick actions ─────────────────────────────────────────────────────────
  const actions = [
    { id: "send", label: "Send", tint: C.violet },
    { id: "receive", label: "Receive", tint: C.mint },
    { id: "swap", label: "Swap", tint: C.amber },
    { id: "buy", label: "Buy", tint: C.coral },
  ];

  actions.forEach((action, i) => {
    const x = 24 + i * 85;

    rect(`action-${action.id}`, {
      x,
      y: 302,
      w: 72,
      h: 70,
      r: 20,
      fill: C.surface,
      stroke: C.border,
    });
    circle(`action-${action.id}-icon`, { x: x + 25, y: 316, d: 22, fill: action.tint });
    text(`action-${action.id}-label`, {
      x,
      y: 348,
      w: 72,
      text: action.label,
      size: 11,
      weight: 500,
      fill: C.muted,
      align: "center",
    });
  });

  // ── asset list ────────────────────────────────────────────────────────────
  text("assets-heading", {
    x: 24,
    y: 394,
    w: 200,
    text: "Your assets",
    size: 15,
    weight: 600,
    fill: C.text,
  });
  text("assets-see-all", {
    x: 251,
    y: 396,
    w: 100,
    text: "See all",
    size: 12,
    weight: 500,
    fill: C.violetSoft,
    align: "right",
  });

  const assets = [
    {
      id: "eth",
      symbol: "ETH",
      name: "Ethereum",
      holding: "2.412 ETH",
      value: "$8,214.90",
      change: "+2.14%",
      tint: "#627EEA",
      onTint: C.text,
      changeFill: C.mint,
    },
    {
      id: "sol",
      symbol: "SOL",
      name: "Solana",
      holding: "38.20 SOL",
      value: "$3,140.20",
      change: "+5.41%",
      tint: "#14F195",
      onTint: C.onLight,
      changeFill: C.mint,
    },
    {
      id: "usdc",
      symbol: "USDC",
      name: "USD Coin",
      holding: "1,125.26 USDC",
      value: "$1,125.26",
      change: "0.00%",
      tint: "#2775CA",
      onTint: C.text,
      changeFill: C.muted,
    },
  ];

  assets.forEach((asset, i) => {
    const y = 424 + i * 72;

    rect(`asset-${asset.id}`, {
      x: 24,
      y,
      w: 327,
      h: 64,
      r: 18,
      fill: C.surface,
      stroke: C.border,
    });
    circle(`asset-${asset.id}-token`, { x: 40, y: y + 14, d: 36, fill: asset.tint });
    text(`asset-${asset.id}-symbol`, {
      x: 40,
      y: y + 26,
      w: 36,
      text: asset.symbol,
      size: 10,
      weight: 700,
      fill: asset.onTint,
      align: "center",
    });
    text(`asset-${asset.id}-name`, {
      x: 88,
      y: y + 15,
      w: 140,
      text: asset.name,
      size: 14,
      weight: 600,
      fill: C.text,
    });
    text(`asset-${asset.id}-holding`, {
      x: 88,
      y: y + 35,
      w: 140,
      text: asset.holding,
      size: 12,
      fill: C.muted,
    });
    text(`asset-${asset.id}-value`, {
      x: 219,
      y: y + 15,
      w: 116,
      text: asset.value,
      size: 14,
      weight: 600,
      fill: C.text,
      align: "right",
    });
    text(`asset-${asset.id}-change`, {
      x: 219,
      y: y + 35,
      w: 116,
      text: asset.change,
      size: 12,
      fill: asset.changeFill,
      align: "right",
    });
  });

  // ── tab bar ───────────────────────────────────────────────────────────────
  rect("tabbar", {
    x: 24,
    y: 700,
    w: 327,
    h: 76,
    r: 26,
    fill: C.surface,
    stroke: C.border,
  });

  const tabs = [
    { id: "home", label: "Home", active: true },
    { id: "swap", label: "Swap", active: false },
    { id: "earn", label: "Earn", active: false },
    { id: "profile", label: "Profile", active: false },
  ];

  const TAB_WIDTH = 327 / tabs.length;

  tabs.forEach((tab, i) => {
    const center = 24 + TAB_WIDTH * (i + 0.5);
    const tint = tab.active ? C.violetSoft : C.muted;

    if (tab.active) {
      rect("tab-active", {
        x: center - 30,
        y: 712,
        w: 60,
        h: 52,
        r: 18,
        fill: "rgba(108, 76, 255, 0.22)",
      });
    }

    circle(`tab-${tab.id}-icon`, { x: center - 6, y: 724, d: 12, fill: tint });
    text(`tab-${tab.id}-label`, {
      x: center - 35,
      y: 744,
      w: 70,
      text: tab.label,
      size: 10,
      weight: 500,
      fill: tint,
      align: "center",
    });
  });

  rect("home-indicator", {
    x: (FRAME.width - 134) / 2,
    y: 790,
    w: 134,
    h: 5,
    r: 3,
    fill: C.indicator,
  });

  return entries;
};
